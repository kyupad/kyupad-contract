use anchor_lang::prelude::*;

use crate::{Master, ID};

pub fn add_admin(ctx: Context<AddAdmin>, address: Pubkey) -> Result<()> {
    let admin_pda = &mut ctx.accounts.admin_pda;
    admin_pda.admin_key = address;
    Ok(())
}

pub fn delete_admin(ctx: Context<DeleteAdmin>, _address: Pubkey) -> Result<()> {
    let signer = &mut ctx.accounts.signer;
    let admin_pda = &ctx.accounts.admin_pda;

    let dest_starting_lamports = signer.lamports();
    **signer.lamports.borrow_mut() = dest_starting_lamports
        .checked_add(admin_pda.lamports())
        .unwrap();

    **admin_pda.lamports.borrow_mut() = 0;
    let mut source_data = admin_pda.data.borrow_mut();
    source_data.fill(0);

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
        bump
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
    )]
    /// CHECK:
    pub admin_pda: AccountInfo<'info>,
}

#[account]
#[derive(Debug,InitSpace)]
pub struct Admin {
    pub admin_key: Pubkey
}