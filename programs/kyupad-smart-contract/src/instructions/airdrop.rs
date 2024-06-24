use anchor_lang::prelude::*;
use mpl_bubblegum::instructions::MintToCollectionV1CpiBuilder;
use mpl_bubblegum::types::MetadataArgs;
use crate::*;
use crate::instructions::Admin;

pub fn airdrop(
    ctx: Context<Airdrop>,
    data: Vec<u8>,
) -> Result<()> {
    let mint_counter_collection = &mut ctx.accounts.mint_counter_collection;

    let metadata_args = MetadataArgs::try_from_slice(&data).unwrap();

    let seeds: &[&[u8]] = &[b"update_authority"];

    let (_, bump) = Pubkey::find_program_address(&seeds, &ID);

    let seeds_admin = &mut seeds.to_vec();
    let binding = [bump];
    seeds_admin.push(&binding);

    MintToCollectionV1CpiBuilder::new(&ctx.accounts.collection_authority_record_pda.to_account_info())
        .bubblegum_signer(&ctx.accounts.bubblegum_signer.to_account_info())
        .collection_authority(&ctx.accounts.collection_authority.to_account_info())
        .collection_authority_record_pda(Some(&ctx.accounts.collection_authority_record_pda.to_account_info()))
        .collection_edition(&ctx.accounts.edition_account.clone())
        .collection_metadata(&ctx.accounts.collection_metadata.clone())
        .collection_mint(&ctx.accounts.collection_mint.clone())
        .compression_program(&ctx.accounts.compression_program.to_account_info())
        .leaf_delegate(&ctx.accounts.minter.to_account_info())
        .leaf_owner(&ctx.accounts.minter.to_account_info())
        .log_wrapper(&ctx.accounts.log_wrapper.to_account_info())
        .merkle_tree(&ctx.accounts.merkle_tree.to_account_info())
        .payer(&ctx.accounts.admin.to_account_info())
        .system_program(&ctx.accounts.system_program.to_account_info())
        .tree_creator_or_delegate(&ctx.accounts.collection_authority.to_account_info())
        .token_metadata_program(&ctx.accounts.token_metadata_program.clone())
        .tree_config(&ctx.accounts.tree_authority.to_account_info())
        .metadata(metadata_args)
        .invoke_signed(&[seeds_admin])?;

    mint_counter_collection.count += 1;

    Ok(())
}

#[derive(Accounts)]
pub struct Airdrop<'info> {
    #[account(mut, constraint = admin.key() == admin_pda.admin_key)]
    pub admin: Signer<'info>,

    /// CHECK:
    pub minter: AccountInfo<'info>,

    #[account(
    init_if_needed,
    payer = admin,
    space = 8 + MintCounterCollection::INIT_SPACE,
    seeds=[MintCounterCollection::PREFIX_SEED, minter.key().as_ref(), collection_mint.key().as_ref()],
    bump
    )]
    pub mint_counter_collection: Account<'info, MintCounterCollection>,

    #[account(
    seeds = [b"admin", admin.key().as_ref()],
    bump,
    owner = ID,
    )]
    pub admin_pda: Account<'info, Admin>,

    #[account(
    seeds = [Pools::PREFIX_SEED, collection_mint.key().as_ref()],
    bump,
    owner = ID
    )]
    pub pools: Account<'info, Pools>,

    #[account(mut)]
    /// CHECK: unsafe
    pub tree_authority: AccountInfo<'info>,

    #[account(mut)]
    /// CHECK: unsafe
    pub merkle_tree: UncheckedAccount<'info>,
    /// CHECK:
    pub collection_authority: AccountInfo<'info>,
    /// CHECK: Optional collection authority record PDA.
    /// If there is no collecton authority record PDA then
    /// this must be the Bubblegum program address.
    pub collection_authority_record_pda: UncheckedAccount<'info>,
    /// CHECK: This account is checked in the instruction
    pub collection_mint: AccountInfo<'info>,
    #[account(mut)]
    /// CHECK:
    pub collection_metadata: AccountInfo<'info>,
    /// CHECK:
    pub edition_account: AccountInfo<'info>,
    /// CHECK: This is just used as a signing PDA.
    pub bubblegum_signer: UncheckedAccount<'info>,
    /// CHECK:
    pub log_wrapper: AccountInfo<'info>,
    /// CHECK:
    pub compression_program: AccountInfo<'info>,
    /// CHECK:
    pub token_metadata_program: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}