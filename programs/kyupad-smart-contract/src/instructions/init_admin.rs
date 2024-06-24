use anchor_lang::prelude::*;

pub fn init_admin(ctx: Context<InitAdmin>, address: Pubkey) -> Result<()> {
    let admin_pda = &mut ctx.accounts.admin_pda;
    admin_pda.admin_key = address;

    Ok(())
}

#[derive(Accounts)]
#[instruction(address: Pubkey)]
pub struct InitAdmin<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    /// CHECK
    #[account(
        init,
        payer = signer, 
        space = 8 + Admin::INIT_SPACE, 
        seeds = [b"admin", address.as_ref()], 
        bump
     )]
    pub admin_pda: Account<'info, Admin>,

    pub system_program: Program<'info, System>,

    #[account(
        constraint = kyupad_program_data.upgrade_authority_address == Some(signer.key()))]
    pub kyupad_program_data: Account<'info, ProgramData>,
}
#[account]
#[derive(Debug, InitSpace)]
pub struct Admin {
    pub admin_key: Pubkey
}

