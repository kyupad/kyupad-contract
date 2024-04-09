use crate::errors::KyuPadError;
use crate::state::*;
use crate::utils::*;
use crate::PoolMinted;
use crate::Pools;
use anchor_lang::prelude::*;
use anchor_lang::solana_program;
use mint_counter::MintCounter;
use mpl_bubblegum::cpi::accounts::MintToCollectionV1;
use mpl_bubblegum::cpi::mint_to_collection_v1;
use mpl_bubblegum::MetadataArgs;
use mpl_bubblegum::TreeConfig;
use spl_account_compression::program::SplAccountCompression;
use spl_account_compression::Noop;

pub fn mint_cft<'c: 'info, 'info>(
    ctx: Context<'_, '_, 'c, 'info, MintcNFT<'info>>,
    merkle_proof: Vec<[u8; 32]>,
    merkle_root: Vec<u8>,
    data: Vec<u8>,
) -> Result<()> {
    let minter = &ctx.accounts.minter;
    let pools = &ctx.accounts.pools;
    let pools_config = &pools.pools_config;
    let pool_minted = &ctx.accounts.pool_minted;
    let system_program = &ctx.accounts.system_program;

    let mut valid_merke_root = false;

    let mint_counter = &ctx.remaining_accounts[0];

    for pool_config in pools_config.iter() {
        if pool_config.merkle_root == merkle_root {

            // Check to see if the pool's supply has run out
            if pool_minted.remaining_assets <= 0  {
                return Err(KyuPadError::PoolSupplyRunOut.into());
            }

            valid_merke_root = true;
            let leaf = solana_program::keccak::hashv(&[minter.key().to_string().as_bytes()]);

            // check if this address is allow to mint
            let verify_minter = verify(
                &merkle_proof[..],
                merkle_root.as_slice().try_into().unwrap(),
                &leaf.0,
            );

            if verify_minter {
                // Check if counter mint for minter
                MintCounter::validate(mint_counter, minter.to_account_info(), pools.to_account_info(), pool_config.id.clone(), pool_config.total_mint_per_wallet)?;

                // Check enough lamport to mint
                // PoolConfig::validate(pool_config, minter.to_account_info())?;

                let mint_cnft_accounts = MintToCollectionV1 {
                    tree_authority: ctx.accounts.tree_authority.to_account_info(),
                    leaf_owner: ctx.accounts.minter.to_account_info(),
                    leaf_delegate: ctx.accounts.minter.to_account_info(),
                    merkle_tree: ctx.accounts.merkle_tree.to_account_info(),
                    payer: ctx.accounts.minter.to_account_info(),
                    tree_delegate: ctx.accounts.minter.to_account_info(),
                    collection_authority: ctx.accounts.collection_authority.to_account_info(),
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

                // Call mint_to_collection_v1 and handle the result
                mint_to_collection_v1(mint_cnft_context, metadata_args)?;

                // increase mint counter
                MintCounter::increase(mint_counter, minter.to_account_info(), pools.to_account_info(), system_program.to_account_info(), pool_config.id.clone())?;

                // // Pay for the mint
                // PoolConfig::actions(pool_config, minter.to_account_info(), destination, system_program.to_account_info());
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
        seeds=[Pools::PREFIX_SEED, minter.key().as_ref(), collection_mint.key().as_ref()], 
        bump
    )]
    pub pools: Account<'info, Pools>,

    #[account(
        mut,
        // seeds=[PoolMinted::PREFIX_SEED, pools.key().as_ref(), merkle_root.as_ref()], 
        // bump
    )]
    pub pool_minted: Account<'info, PoolMinted>,

    #[account(mut)]
    pub tree_authority: Account<'info, TreeConfig>,

    #[account(mut)]
    /// CHECK: unsafe
    pub merkle_tree: UncheckedAccount<'info>,
    /// CHECK:
    pub collection_authority: Signer<'info>,
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

