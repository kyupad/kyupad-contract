use anchor_lang::prelude::*;

pub fn init_admin(ctx: Context<InitAdmin>, _address: Pubkey) -> Result<()> {
    let admin_pda = &mut ctx.accounts.admin_pda;
    admin_pda.is_admin = true;
    Ok(())
}

#[derive(Accounts)]
#[instruction(_address: Pubkey)]
pub struct InitAdmin<'info> {
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

#[account]
#[derive(Debug, InitSpace)]
pub struct Admin {
    pub is_admin: bool    
}
