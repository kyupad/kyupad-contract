use anchor_lang::prelude::*;

use crate::{errors::KyuPadError, Admin, Pools};

pub fn update_pool_config(
    ctx: Context<UpdatePoolConfig>,
    args: UpdatePoolConfigArgs,
) -> Result<()> {
    let pools = &mut ctx.accounts.pools;
    if args.merkle_root.len() != (32 as usize) {
        return Err(KyuPadError::InvalidMekleRoot.into());
    }

    let mut valid_pool_id = false;
    for pool_config in &mut pools.pools_config {
        if pool_config.id == args.pool_id {
            valid_pool_id = true;
            pool_config.merkle_root = args.merkle_root.clone();
            match args.total_pool_supply {
                Some(pool_supply) => {
                    pool_config.pool_supply = pool_supply;
                }
                None => {}
            }
        }
    }

    if !valid_pool_id {
        return Err(KyuPadError::PoolIdInvalid.into());
    }

    Ok(())
}
#[derive(Debug, AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UpdatePoolConfigArgs {
    pub pool_id: String,
    pub merkle_root: Vec<u8>,
    pub total_pool_supply: Option<u16>,
}

#[derive(Accounts)]
pub struct UpdatePoolConfig<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    /// CHECK
    #[account(
        seeds = [b"admin", signer.key.as_ref()], 
        bump
     )]
    pub admin_pda: Account<'info, Admin>,

    /// CHECK:
    pub collection_mint: AccountInfo<'info>,

    #[account(
        mut,
        seeds=[b"pools", collection_mint.key.as_ref()], 
        bump,
    )]
    pub pools: Account<'info, Pools>,

    pub system_program: Program<'info, System>,
}
