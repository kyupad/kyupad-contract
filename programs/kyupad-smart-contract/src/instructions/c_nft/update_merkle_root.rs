use anchor_lang::prelude::*;

use crate::Admin;

pub fn update_merkle_root(ctx: Context<UpdateMerkleRoot>, _address: Pubkey) -> Result<()> {
    let admin_pda = &mut ctx.accounts.admin_pda;
    admin_pda.is_admin = true;
    Ok(())
}

#[derive(Accounts)]
#[instruction(_address: Pubkey)]
pub struct UpdateMerkleRoot<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    /// CHECK
    #[account(
        init_if_needed, 
        payer = signer, 
        space = 8 + Admin::INIT_SPACE, 
        seeds = [b"admin", _address.as_ref()], 
        bump
     )]
    pub admin_pda: Account<'info,  Admin>,

    pub system_program: Program<'info, System>,
}
