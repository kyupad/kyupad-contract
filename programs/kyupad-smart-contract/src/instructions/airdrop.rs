use anchor_lang::prelude::*;
use anchor_lang::solana_program;
use mpl_bubblegum::instructions::MintToCollectionV1CpiBuilder;
use mpl_bubblegum::types::MetadataArgs;

use crate::*;
use crate::errors::KyuPadError;
use crate::instructions::Admin;
use crate::utils::{assert_keys_equal, verify};

pub fn airdrop<'c: 'info, 'info>(
    ctx: Context<'_, '_, 'c, 'info, Airdrop<'info>>,
    pool_id: String,
    wallet: Pubkey,
    data: Vec<u8>,
) -> Result<()> {
    let pools = &mut ctx.accounts.pools;
    let pools_config = &pools.pools_config;
    let pool_minted = &mut ctx.accounts.pool_minted;
    let system_program = &ctx.accounts.system_program;
    let destination = &ctx.accounts.destination;
    let mint_counter_collection = &mut ctx.accounts.mint_counter_collection;

    // Check if user is allowed mint is reached
    if mint_counter_collection.count >= pools.max_mint_of_wallet {
        return Err(KyuPadError::AllowedMintLimitReached.into());
    }

    for pool_config in pools_config {
        if pool_config.id == pool_id {

            // Check to see if the pool's supply has run out
            if pool_minted.remaining_assets <= 0 {
                return Err(KyuPadError::PoolSupplyRunOut.into());
            }

            // Remaining assets is minus 1
            pool_minted.remaining_assets -= 1;

            // Check if counter mint for minter
            MintCounter::validate(mint_counter, minter.to_account_info(), pools.to_account_info(), pool_config.id.clone(), pool_config.total_mint_per_wallet)?;

            // Check if in the time allow
            let clock = Clock::get()?;
            let current_timestamp = clock.unix_timestamp;
            if current_timestamp < pool_config.start_date || current_timestamp > pool_config.end_date {
                return Err(KyuPadError::NotMintTime.into());
            }

            //  Check if have exclusion_pools
            match &pool_config.exclusion_pools {
                Some(exclusion_pools) => {
                    for pool_id in exclusion_pools {
                        let seeds: &[&[u8]] = &[
                            MintCounter::PREFIX_SEED,
                            pool_id.as_ref(),
                            minter.key.as_ref(),
                            pools.to_account_info().key.as_ref(),
                        ];

                        let (pda, _) = Pubkey::find_program_address(&seeds, &ID);

                        let another_minter = next_account_info(remaining_accounts_iter)?;
                        assert_keys_equal(&pda, &another_minter.key)?;

                        // check if this account is already exist
                        if **another_minter.try_borrow_lamports()? > 0 {
                            return Err(KyuPadError::AllowedMintLimitReached.into());
                        }
                    }
                }
                None => {}
            }

            let metadata_args = MetadataArgs::try_from_slice(&data).unwrap();

            let seeds: &[&[u8]] = &[b"update_authority"];

            let (_, bump) = Pubkey::find_program_address(&seeds, &ID);

            let seeds_signer = &mut seeds.to_vec();
            let binding = [bump];
            seeds_signer.push(&binding);

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
                .payer(&ctx.accounts.minter.to_account_info())
                .system_program(&ctx.accounts.system_program.to_account_info())
                .tree_creator_or_delegate(&ctx.accounts.collection_authority.to_account_info())
                .token_metadata_program(&ctx.accounts.token_metadata_program.clone())
                .tree_config(&ctx.accounts.tree_authority.to_account_info())
                .metadata(metadata_args)
                .invoke_signed(&[seeds_signer])?;

            // increase mint counter
            MintCounter::increase(mint_counter, minter.to_account_info(), pools.to_account_info(), system_program.to_account_info(), pool_config.id.clone())?;


            let result = assert_keys_equal(&pool_config.destination, &destination.key);
            match result {
                Ok(_) => {
                    // Pay for the mint
                    PoolConfig::actions(pool_config, minter.to_account_info(), destination.clone(), system_program.to_account_info())?;
                }
                Err(_) => {
                    return Err(KyuPadError::DestinationIsInvalid.into());
                }
            }

            msg!("{}", mint_counter_collection.count);

            mint_counter_collection.count += 1;

            msg!("{}", mint_counter_collection.count);
        }
    }


    Ok(())
}

#[derive(Accounts)]
#[instruction(wallet: Pubkey, pool_id: String)]
pub struct Airdrop<'info> {
    #[account(mut, constraint = signer.key() == admin_pda.admin_key)]
    pub signer: Signer<'info>,

    #[account(
    seeds = [b"admin", signer.key().as_ref()],
    bump,
    owner = ID,
    )]
    pub admin_pda: Account<'info, Admin>,

    #[account(
    seeds = [Pools::PREFIX_SEED, collection_mint.key().as_ref()],
    bump
    )]
    pub pools: Account<'info, Pools>,

    #[account(
    init_if_needed,
    payer = signer,
    space = 8 + MintCounterCollection::INIT_SPACE,
    seeds = [MintCounterCollection::PREFIX_SEED, wallet.key().as_ref(), collection_mint.key().as_ref()],
    bump
    )]
    pub mint_counter_collection: Account<'info, MintCounterCollection>,

    /// CHECK:
    #[account(mut)]
    pub destination: AccountInfo<'info>,

    #[account(
    mut,
    seeds = [PoolMinted::PREFIX_SEED, pools.key().as_ref(), pool_id.as_bytes()],
    bump
    )]
    pub pool_minted: Account<'info, PoolMinted>,

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