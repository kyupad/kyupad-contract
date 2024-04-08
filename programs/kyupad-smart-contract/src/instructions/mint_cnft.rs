use crate::errors::KyuPadError;
use crate::utils::verify;
use crate::Groups;
use anchor_lang::prelude::*;
use anchor_lang::solana_program;
use mpl_bubblegum::cpi::accounts::MintToCollectionV1;
use mpl_bubblegum::cpi::mint_to_collection_v1;
use mpl_bubblegum::MetadataArgs;
use mpl_bubblegum::TreeConfig;
use spl_account_compression::program::SplAccountCompression;
use spl_account_compression::Noop;

pub fn mint_cft(
    ctx: Context<MintcNFT>,
    merkle_proof: Vec<[u8; 32]>,
    merkle_root: Vec<u8>,
    data: Vec<u8>,
) -> Result<()> {
    let minter = &ctx.accounts.minter;
    let groups = &ctx.accounts.groups;
    let groups_config = &groups.groups_config;

    let mut valid_merke_root = false;

    for gc in groups_config.iter() {
        if gc.merkle_root == merkle_root {
            valid_merke_root = true;
            let leaf = solana_program::keccak::hashv(&[minter.key().to_string().as_bytes()]);

            let verify_minter = verify(
                &merkle_proof[..],
                merkle_root.as_slice().try_into().unwrap(),
                &leaf.0,
            );

            if verify_minter {
                let mint_cnft_accounts = MintToCollectionV1 {
                    tree_authority: ctx.accounts.tree_authority.to_account_info(),
                    leaf_owner: ctx.accounts.leaf_owner.clone(),
                    leaf_delegate: ctx.accounts.leaf_delegate.clone(),
                    merkle_tree: ctx.accounts.merkle_tree.to_account_info(),
                    payer: ctx.accounts.payer.clone(),
                    tree_delegate: ctx.accounts.tree_delegate.clone(),
                    collection_authority: ctx.accounts.collection_authority.clone(),
                    collection_authority_record_pda: ctx
                        .accounts
                        .collection_authority_record_pda
                        .to_account_info(),
                    collection_mint: ctx.accounts.collection_mint.clone(),
                    collection_metadata: ctx.accounts.collection_metadata.clone(),
                    edition_account: ctx.accounts.edition_account.clone(),
                    bubblegum_signer: ctx.accounts.bubblegum_signer.to_account_info(),
                    log_wrapper: ctx.accounts.log_wrapper.to_account_info(),
                    compression_program: ctx.accounts.compression_program.to_account_info(),
                    token_metadata_program: ctx.accounts.token_metadata_program.clone(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                };

                let mint_cnft_context = CpiContext::new(
                    ctx.accounts
                        .collection_authority_record_pda
                        .to_account_info(),
                    mint_cnft_accounts,
                );

                let metadata_args = MetadataArgs::try_from_slice(&data).unwrap();

                mint_to_collection_v1(mint_cnft_context, metadata_args).unwrap();

            } else {
                return Err(KyuPadError::InvalidWallet.into());
            }
        }
    }

    if !valid_merke_root {
        return Err(KyuPadError::InvalidMekleRoot.into());
    }

    Ok(())
}

#[derive(Accounts)]
#[instruction(merkle_root: Vec<u8>)]
pub struct MintcNFT<'info> {
    #[account(mut)]
    pub minter: Signer<'info>,

    #[account(
        seeds=[b"groups", collection_authority.key().as_ref(), collection_mint.key().as_ref()], 
        bump
    )]
    pub groups: Account<'info, Groups>,

    // #[account(
    //     mut,
    //     seeds=[TmpGroupData::SEED, groups.key().as_ref()], 
    //     bump
    // )]
    // pub groups_follow: AccountInfo<'info>,

    #[account(mut)]
    pub tree_authority: Account<'info, TreeConfig>,
    /// CHECK:
    pub leaf_owner: AccountInfo<'info>,
    /// CHECK:
    pub leaf_delegate: AccountInfo<'info>,

    #[account(mut)]
    /// CHECK: unsafe
    pub merkle_tree: UncheckedAccount<'info>,
    /// CHECK:
    pub payer: AccountInfo<'info>,
    /// CHECK:
    pub tree_delegate: AccountInfo<'info>,
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
    pub log_wrapper: Program<'info, Noop>,
    pub compression_program: Program<'info, SplAccountCompression>,
    /// CHECK:
    pub token_metadata_program: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}
