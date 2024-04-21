use anchor_lang::prelude::*;

use crate::{errors::KyuPadError, state::PoolConfig, Admin, PoolConfigArgs, PoolMinted, Pools};

pub fn add_pool_config<'c: 'info, 'info>(
    ctx: Context<'_, '_, 'c, 'info, AddPoolConfig<'info>>,
    pool_config_args: PoolConfigArgs,
) -> Result<()> {
    let pools = &mut ctx.accounts.pools;
    let collection_mint = &ctx.accounts.collection_mint;
    let pool_minted = &mut ctx.accounts.pool_minted;

    for pool_config in &pools.pools_config {
        if pool_config.id == pool_config_args.id {
            return Err(KyuPadError::CannotAddPoolConfig.into());
        }
    }

    let new_group_config = PoolConfig {
        id: pool_config_args.id.clone(),
        start_date: pool_config_args.start_date,
        end_date: pool_config_args.end_date,
        merkle_root: pool_config_args.merkle_root.clone(),
        total_mint_per_wallet: pool_config_args.total_mint_per_wallet,
        destination: collection_mint.key.clone(),
        payment: pool_config_args.payment,
        pool_supply: pool_config_args.pool_supply,
        exclusion_pools: pool_config_args.exclusion_pools.clone(),
    };

    pool_minted.remaining_assets = pool_config_args.pool_supply;

    pools.pools_config.push(new_group_config);

    Ok(())
}

#[derive(Accounts)]
#[instruction(pool_config_args: PoolConfigArgs)]
pub struct AddPoolConfig<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        seeds=[b"admin", creator.key().as_ref()],  
        bump
    )]
    pub admin_pda: Account<'info, Admin>,

    /// CHECK:
    pub collection_mint: AccountInfo<'info>,

    #[account(
        mut,
        seeds=[b"pools", collection_mint.key().as_ref()], 
        bump
    )]
    pub pools: Account<'info, Pools>,

    #[account(
        init_if_needed,
        payer = creator,
        seeds=[PoolMinted::PREFIX_SEED, pools.key().as_ref(), pool_config_args.id.as_bytes()],
        space = 8 + PoolMinted::INIT_SPACE,
        bump
    )]
    pub pool_minted: Account<'info, PoolMinted>,

    pub system_program: Program<'info, System>,
}
