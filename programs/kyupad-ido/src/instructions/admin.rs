use anchor_lang::prelude::*;

use crate::{Master, ID};

pub fn add_admin(ctx: Context<AddAdmin>, address: Pubkey) -> Result<()> {
    let admin_pda = &mut ctx.accounts.admin_pda;
    admin_pda.admin_key = address;
    Ok(())
}

pub fn delete_admin(_ctx: Context<DeleteAdmin>, _address: Pubkey) -> Result<()> {
    Ok(())
}

#[derive(Accounts)]
#[instruction(address: Pubkey)]
pub struct AddAdmin<'info> {
    #[account(
        mut,
        constraint = signer.key() == master_pda.master_key
    )]
    pub signer: Signer<'info>,

    #[account(
        seeds = [b"master"],
        bump,
        owner = ID,
    )]
    pub master_pda: Account<'info, Master>,

    /// CHECK
    #[account(
        init, 
        payer = signer, 
        space = 8 + Admin::INIT_SPACE, 
        seeds = [b"admin", address.key().as_ref()], 
        bump,
     )]
    pub admin_pda: Account<'info, Admin>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(_address: Pubkey)]
pub struct DeleteAdmin<'info> {
    #[account(
        mut,
        constraint = signer.key() == master_pda.master_key
    )]
    pub signer: Signer<'info>,

    #[account(
        seeds = [b"master"],
        bump,
        owner = ID,
    )]
    pub master_pda: Account<'info, Master>,

    #[account(
        mut, 
        seeds = [b"admin",_address.key().as_ref() ], 
        bump,
        owner = ID,
        close = signer
    )]
    /// CHECK:
    pub admin_pda: Account<'info, Admin>,
}

#[account]
#[derive(Debug,InitSpace)]
pub struct Admin {
    pub admin_key: Pubkey
}