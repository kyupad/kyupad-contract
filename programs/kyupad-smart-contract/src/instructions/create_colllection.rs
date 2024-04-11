use anchor_lang::prelude::*;
use mpl_token_metadata::{instructions::{CreateMasterEditionV3CpiBuilder, CreateMetadataAccountV3CpiBuilder, SetCollectionSizeCpiBuilder}, types::{DataV2, SetCollectionSizeArgs},
};

use mpl_bubblegum::instructions::CreateTreeConfigCpiBuilder;
use spl_account_compression::{program::SplAccountCompression, Noop};


use crate::ID;

use spl_token::{instruction::mint_to, solana_program::program::invoke_signed};


pub fn create_collection(ctx: Context<CreateCollection>, data: Vec<u8>, max_depth: u32, max_buffer_size: u32, public: Option<bool>, _tree_space: u32) -> Result<()> {
    let metadata = DataV2::try_from_slice(&data).unwrap();
    let seeds: &[&[u8]] = &[b"update_authority"];

    let (_, bump) = Pubkey::find_program_address(&seeds, &ID);

    let seeds_signer = &mut seeds.to_vec();
    let binding = [bump];
    seeds_signer.push(&binding);
    
    CreateTreeConfigCpiBuilder::new(&ctx.accounts.mpl_bubble_gum_program)
    .compression_program(&ctx.accounts.compression_program)
    .log_wrapper(&ctx.accounts.log_wrapper)
    .merkle_tree(&ctx.accounts.merkle_tree)
    .tree_config(&ctx.accounts.tree_config)
    .payer(&ctx.accounts.creator)
    .system_program(&ctx.accounts.system_program)
    .tree_creator(&ctx.accounts.update_authority)
    .max_depth(max_depth)
    .max_buffer_size(max_buffer_size)
    .public(
        match public {
        Some(_) =>  true,
        None => false
    }).invoke_signed(&[seeds_signer])?;

    let mint_to_ins = mint_to(&ctx.accounts.token_program.key(), 
    &ctx.accounts.mint.key, 
    &ctx.accounts.collection_token_account.key, 
    &ctx.accounts.update_authority.key, 
    &[], 1)?;

    invoke_signed(
        &mint_to_ins, 
        &[
            ctx.accounts.token_program.clone(),
            ctx.accounts.mint.clone(),
            ctx.accounts.update_authority.clone(),
            ctx.accounts.collection_token_account.clone(),
            ctx.accounts.creator.to_account_info().clone()
        ], 
        &[seeds_signer]
    )?;
    

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

    SetCollectionSizeCpiBuilder::new(&ctx.accounts.token_metadata_program)
    .collection_metadata(&ctx.accounts.metadata)
    .collection_authority(&ctx.accounts.update_authority)
    .collection_mint(&ctx.accounts.mint)
    .set_collection_size_args(SetCollectionSizeArgs {
        size: 50
    })
    .invoke_signed(&[seeds_signer])?;
    
    Ok(())
}

#[derive(Accounts)]
#[instruction(_tree_space: u32)]
pub struct CreateCollection<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(mut)]
    /// CHECK:
    pub metadata: AccountInfo<'info>,

    #[account(mut)]
    /// CHECK:
    pub merkle_tree: AccountInfo<'info>,

    #[account(mut)]
    /// CHECK:
    pub tree_config: AccountInfo<'info>,

    /// CHECK:
    #[account(mut)]
    pub mint: AccountInfo<'info>,

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
    pub mpl_bubble_gum_program: AccountInfo<'info>,
    pub compression_program: Program<'info, SplAccountCompression>,
    pub log_wrapper: Program<'info, Noop>,

    /// CHECK:
    pub token_program: AccountInfo<'info>,
}
