use anchor_lang::prelude::*;
use crate::*;
use crate::errors::KyuPadError;

pub fn add_private_allocate<'c: 'info, 'info>(ctx: Context<'_, '_, 'c, 'info, AddPrivateAllocate<'info>>, add_private_allocate_args: AddPrivateAllocateArgs) -> Result<()> {
    let project_counter = &mut ctx.accounts.project_counter;
    let investor_counter = &mut ctx.accounts.investor_counter;
    let project = &mut ctx.accounts.project;

    if add_private_allocate_args.ticket_amount <= 0  {
        return Err(KyuPadError::InvalidTicketAmount.into())
    }

    // Check if in the time allow
    let clock = Clock::get()?;
    let current_timestamp = clock.unix_timestamp;
    if current_timestamp >= project.start_date {
        return Err(KyuPadError::NotInvestTime.into());
    }

    // check if you have enough ticket to invest
    if project_counter.remaining <= add_private_allocate_args.ticket_amount as u32 {
        return Err(KyuPadError::ProjectOutOfTicket.into());
    }

    // calculate remaining ticket for project's counter
    project_counter.remaining -= add_private_allocate_args.ticket_amount as u32;

    // increase total_invested_ticket by an amount equal to ticket_amount
    investor_counter.total_private_allocated_ticket += add_private_allocate_args.ticket_amount;

    // Assign these two value fields to serve fetching data
    investor_counter.wallet = add_private_allocate_args.investor;
    investor_counter.project_id = add_private_allocate_args.project_id.clone();

    Ok(())
}

#[derive(Accounts)]
#[instruction(add_private_allocate_args: AddPrivateAllocateArgs)]
pub struct AddPrivateAllocate<'info> {
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
    seeds = [ProjectConfig::PREFIX_SEED, add_private_allocate_args.project_id.as_bytes()],
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
    seeds = [InvestorCounter::PREFIX_SEED, project.key().as_ref(), add_private_allocate_args.investor.key().as_ref()],
    bump
    )]
    pub investor_counter: Account<'info, InvestorCounter>,

    // pub token_program: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}


#[derive(Debug, AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct AddPrivateAllocateArgs {
    #[max_len(24)]
    pub project_id: String,

    pub investor: Pubkey,

    pub ticket_amount: u8,
}
