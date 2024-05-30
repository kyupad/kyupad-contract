use anchor_lang::prelude::*;

use crate::*;

pub fn invest_private(ctx: Context<InvestPrivate>, invest_private_args: InvestPrivateArgs) -> Result<()> {

    Ok(())
}

#[derive(Accounts)]
#[instruction(invest_private_args: InvestPrivateArgs)]
pub struct InvestPrivate<'info> {
    #[account(
    mut,
    constraint = signer.key() == admin_pda.admin_key
    )]
    pub signer: Signer<'info>,

    #[account(
    seeds = [b"admin", signer.key().as_ref()],
    bump,
    owner = ID,
    )]
    pub admin_pda: Account<'info, Admin>,

    #[account(
    seeds = [ProjectConfig::PREFIX_SEED, invest_private_args.project_id.as_bytes()],
    bump,
    owner = ID,
    )]
    pub project: Account<'info, ProjectConfig>,

    #[account(
    mut,
    seeds = [ProjectCounter::PREFIX_SEED, project.key().as_ref()],
    bump,
    owner = ID,
    )]
    pub project_counter: Account<'info, ProjectCounter>,

    #[account(
    init_if_needed,
    payer = signer,
    space = 8 + InvestorCounter::INIT_SPACE,
    seeds = [InvestorCounter::PREFIX_SEED, project.key().as_ref(), invest_private_args.investor.key().as_ref()],
    bump
    )]
    pub investor_counter: Account<'info, InvestorCounter>,

    #[account(mut)]
    /// CHECK:
    pub vault_address: AccountInfo<'info>,

    // pub token_program: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}


#[derive(Debug, AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct InvestPrivateArgs {
    #[max_len(24)]
    pub project_id: String,

    pub investor: Pubkey,

    pub ticket_amount: u8,

    pub max_ticket_amount: u8,
}
