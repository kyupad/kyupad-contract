use anchor_lang::prelude::*;

pub fn init_admin(_ctx: Context<InitAdmin>) -> Result<()> {
    Ok(())
}

#[derive(Accounts)]
pub struct InitAdmin<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    /// CHECK
    #[account(
        init_if_needed, 
        payer = signer, 
        space = 0, 
        seeds = [b"admin", admin.key().as_ref()], 
        bump
     )]
    pub admin_pda: AccountInfo<'info>,

    /// CHECK: 
    pub admin: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}
