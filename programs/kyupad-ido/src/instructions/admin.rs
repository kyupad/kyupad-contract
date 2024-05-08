use anchor_lang::prelude::*;

use crate::Master;

pub fn add_admin(_ctx: Context<AddAdmin>, _address: Pubkey) -> Result<()> {
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
#[instruction(_address: Pubkey)]
pub struct AddAdmin<'info> {
    #[account(
        mut,
        constraint = signer.key() == master_pda.master_key
    )]
    pub signer: Signer<'info>,

    #[account(
        seeds = [b"master"],
        bump,
    )]
    pub master_pda: Account<'info, Master>,

    /// CHECK
    #[account(
        init_if_needed, 
        payer = signer, 
        space = 0, 
        seeds = [b"admin", _address.key().as_ref()], 
        bump
     )]
    pub admin_pda: AccountInfo<'info>,

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
    )]
    pub master_pda: Account<'info, Master>,

    #[account(
        mut, 
        seeds = [b"admin",_address.key().as_ref() ], 
        bump
    )]
    /// CHECK:
    pub admin_pda: AccountInfo<'info>,
}