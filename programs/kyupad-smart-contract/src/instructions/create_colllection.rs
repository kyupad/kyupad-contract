use anchor_lang::{prelude::*, system_program::{create_account, CreateAccount}};
use mpl_token_metadata::{instructions::{CreateMasterEditionV3CpiBuilder, CreateMetadataAccountV3CpiBuilder, SetCollectionSizeCpiBuilder}, types::{DataV2, SetCollectionSizeArgs},
};
use crate::ID;

use spl_token::{instruction::{mint_to, initialize_mint2}, solana_program::program::invoke_signed};
use spl_associated_token_account::instruction::create_associated_token_account;

pub fn create_collection(ctx: Context<CreateCollection>, data: Vec<u8>) -> Result<()> {
    let metadata = DataV2::try_from_slice(&data).unwrap();
    let seeds: &[&[u8]] = &[b"update_authority"];

    let (_, bump) = Pubkey::find_program_address(&seeds, &ID);

    let seeds_signer = &mut seeds.to_vec();
    let binding = [bump];
    seeds_signer.push(&binding);

    // create account mint

    create_account(CpiContext::new(ctx.accounts.system_program.to_account_info(), CreateAccount {from: ctx.accounts.creator.to_account_info(), to: ctx.accounts.mint.to_account_info().clone()}), 
    1461600, 82, &ctx.accounts.token_program.key).unwrap();

    // initial mint
    let initial_mint_ints = initialize_mint2(&ctx.accounts.token_program.key, 
        &ctx.accounts.mint.key, 
        &ctx.accounts.update_authority.key, 
        Some(&ctx.accounts.update_authority.key), 0).unwrap();

    invoke_signed(&initial_mint_ints, 
        &[
            ctx.accounts.mint.to_account_info().clone(),
        ], &[seeds_signer]).unwrap();

    // create associated token account
    let create_ata_ins = create_associated_token_account(&ctx.accounts.creator.key, 
        &ctx.accounts.update_authority.key, 
        &ctx.accounts.mint.key, 
        &ctx.accounts.token_program.key);

    invoke_signed(&create_ata_ins, 
        &[
            ctx.accounts.token_program.clone(),
            ctx.accounts.mint.to_account_info().clone(),
            ctx.accounts.update_authority.clone(),
            ctx.accounts.creator.to_account_info().clone(),
            ctx.accounts.collection_token_account.clone(),
            ctx.accounts.system_program.to_account_info().clone()
        ], 
        &[seeds_signer]).unwrap();

    // mint collection to update_authority
    let mint_to_ins = mint_to(&ctx.accounts.token_program.key(), 
    &ctx.accounts.mint.key, 
    &ctx.accounts.collection_token_account.key, 
    &ctx.accounts.update_authority.key, 
    &[], 1)?;

    invoke_signed(
        &mint_to_ins, 
        &[
            ctx.accounts.token_program.clone(),
            ctx.accounts.mint.to_account_info().clone(),
            ctx.accounts.update_authority.clone(),
            ctx.accounts.collection_token_account.clone(),
            ctx.accounts.creator.to_account_info().clone()
        ], 
        &[seeds_signer]
    )?;
    
    // create collection metadata
    CreateMetadataAccountV3CpiBuilder::new(&ctx.accounts.token_metadata_program)
        .metadata(&ctx.accounts.metadata)
        .mint(&ctx.accounts.mint)
        .mint_authority(&ctx.accounts.update_authority)
        .payer(&ctx.accounts.creator)
        .update_authority(&ctx.accounts.update_authority, true)
        .system_program(&ctx.accounts.system_program)
        .data(DataV2 {
            name: metadata.name.clone(),
            symbol: metadata.symbol.clone(),
            uri: metadata.uri.clone(),
            creators: None,
            collection: None,
            seller_fee_basis_points: metadata.seller_fee_basis_points,
            uses: None,
        })
        .is_mutable(false)
        .invoke_signed(&[seeds_signer])?;

    // create master edition 
    CreateMasterEditionV3CpiBuilder::new(&ctx.accounts.token_metadata_program)
    .edition(&ctx.accounts.master_edition)
    .mint(&ctx.accounts.mint)
    .update_authority(&ctx.accounts.update_authority)
    .mint_authority(&ctx.accounts.update_authority)
    .payer(&ctx.accounts.creator)
    .metadata(&ctx.accounts.metadata)
    .token_program(&ctx.accounts.token_program)
    .system_program(&ctx.accounts.system_program)
    .max_supply(0)
    .invoke_signed(&[seeds_signer])?;

    // set collection size
    SetCollectionSizeCpiBuilder::new(&ctx.accounts.token_metadata_program)
    .collection_metadata(&ctx.accounts.metadata)
    .collection_authority(&ctx.accounts.update_authority)
    .collection_mint(&ctx.accounts.mint)
    .set_collection_size_args(SetCollectionSizeArgs {
        size: 50
    })
    .invoke_signed(&[seeds_signer])?;
    
    // try to find out collection size is
    Ok(())
}

#[derive(Accounts)]
pub struct CreateCollection<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(mut)]
    /// CHECK:
    pub metadata: AccountInfo<'info>,

    /// CHECK:
    #[account(mut)]
    pub mint: Signer<'info>,

    /// CHECK:
    #[account(mut)]
    pub collection_token_account: AccountInfo<'info>,

    /// CHECK:
    #[account(mut)]
    pub master_edition: AccountInfo<'info>,

    pub system_program: Program<'info, System>,

    #[account(
        init_if_needed, 
        payer = creator, 
        space = 0,
        seeds = [b"update_authority"], 
        bump, 
    )]
    /// CHECK:
    pub update_authority: AccountInfo<'info>,

    /// CHECK:
    pub token_metadata_program: AccountInfo<'info>,

    /// CHECK:
    pub token_program: AccountInfo<'info>,

    /// CHECK:
    pub associated_token_program: AccountInfo<'info>
}
