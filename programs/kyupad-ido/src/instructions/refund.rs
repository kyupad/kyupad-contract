use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke;
use anchor_lang::solana_program::system_instruction;
use anchor_spl::token::Mint;
use spl_associated_token_account::get_associated_token_address_with_program_id;
use spl_token::instruction::transfer_checked;

use crate::*;

use self::{
    errors::KyuPadError,
    utils::assert_keys_equal,
};

pub fn refund<'c: 'info, 'info>(ctx: Context<'_, '_, 'c, 'info, Refund<'info>>, refund_args: crate::instructions::refund::RefundArgs) -> Result<()> {
    let project = &ctx.accounts.project;
    let investor_counter = &mut ctx.accounts.investor_counter;
    let investor = &ctx.accounts.investor;
    let vault = &ctx.accounts.vault_address;
    let system_program = &ctx.accounts.system_program;

    // check if project have refund
    match &project.refund {
        None => {
            return Err(KyuPadError::ProjectDontRefund.into());
        }
        Some(refund) => {

            // check in time to refund
            let clock = Clock::get()?;
            let current_timestamp = clock.unix_timestamp;
            if current_timestamp < refund.start_date || current_timestamp > refund.end_date {
                return Err(KyuPadError::NotRefundTime.into());
            }

            let number_ticket_to_refund: u8;

            // check if refund all
            if refund.refund_all_ticket_at_once {
                number_ticket_to_refund = investor_counter.total_invested_ticket;
            } else {
                // check if user have enough ticket to refund
                let remaining_ticket = investor_counter.total_invested_ticket - investor_counter.total_refund_amount;
                let refund_ticket_amount = refund_args.refund_ticket_amount.unwrap_or(0);

                if refund_ticket_amount > remaining_ticket || refund_ticket_amount <= 0 {
                    return Err(KyuPadError::InvalidRefundTicketAmount.into());
                }

                number_ticket_to_refund = refund_ticket_amount;
            }

            // refund asset to user
            let transfer_result: std::prelude::v1::Result<(), ProgramError>;
            match &project.token_address {
                None => {
                    transfer_result = invoke(
                        &system_instruction::transfer(
                            &vault.key(),
                            &investor.key(),
                            project.ticket_size * number_ticket_to_refund as u64,
                        ),
                        &[
                            investor.to_account_info().clone(),
                            vault.to_account_info(),
                            system_program.to_account_info(),
                        ],
                    );
                }
                Some(token_address) => {
                    let list_remaining_accounts = &mut ctx.remaining_accounts.iter();
                    let token_program = next_account_info(list_remaining_accounts)?;
                    let mint = next_account_info(list_remaining_accounts)?;
                    let destination = next_account_info(list_remaining_accounts)?;

                    let mint_data: Account<Mint> = Account::try_from(mint)?;

                    // validate mint key
                    assert_keys_equal(&mint.key(), &token_address)?;

                    // validate source key
                    let destination_key = get_associated_token_address_with_program_id(
                        &investor.key,
                        &mint.key,
                        &token_program.key,
                    );

                    assert_keys_equal(&destination.key(), &destination_key)?;

                    transfer_result = invoke(
                        &transfer_checked(
                            token_program.key,
                            &vault.key(),
                            &mint.key(),
                            &destination.key(),
                            vault.key,
                            &[],
                            project.ticket_size * number_ticket_to_refund as u64,
                            mint_data.decimals,
                        )
                            .unwrap(),
                        &[
                            token_program.to_account_info(),
                            destination.to_account_info(),
                            mint.to_account_info(),
                            vault.to_account_info(),
                            investor.to_account_info(),
                        ],
                    );
                }
            }

            match transfer_result {
                Ok(_) => {
                    // increase to total ticket refund amount
                    investor_counter.total_refund_amount += number_ticket_to_refund;
                }
                Err(_) => return Err(KyuPadError::TransferIsError.into()),
            }
        }
    }
    Ok(())
}

#[derive(Debug, AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct RefundArgs {
    #[max_len(24)]
    pub project_id: String,

    pub refund_ticket_amount: Option<u8>,
}

#[derive(Accounts)]
#[instruction(refund_args: RefundArgs)]
pub struct Refund<'info> {
    #[account(mut)]
    pub investor: Signer<'info>,

    #[account(mut)]
    /// CHECK:
    pub vault_address: Signer<'info>,

    #[account(
    seeds = [ProjectConfig::PREFIX_SEED, refund_args.project_id.as_bytes()],
    bump,
    owner = ID,
    )]
    pub project: Account<'info, ProjectConfig>,

    #[account(
    seeds = [InvestorCounter::PREFIX_SEED, project.key().as_ref(), investor.key().as_ref()],
    bump,
    owner = ID,
    )]
    pub investor_counter: Account<'info, InvestorCounter>,

    pub system_program: Program<'info, System>,
}