use anchor_lang::prelude::*;
use spl_token::{
    instruction::transfer_checked,
    solana_program::{self, program::invoke, system_instruction},
};

use crate::*;

use spl_associated_token_account::get_associated_token_address_with_program_id;

use anchor_spl::token::Mint;

use self::{
    errors::KyuPadError,
    utils::{assert_keys_equal, verify},
};

pub fn invest<'c: 'info, 'info>(
    ctx: Context<'_, '_, 'c, 'info, Invest<'info>>,
    invest_args: InvestArgs,
) -> Result<()> {
    let project_counter: &mut Account<ProjectCounter> = &mut ctx.accounts.project_counter;
    let project = &ctx.accounts.project;
    let investor_counter = &mut ctx.accounts.investor_counter;
    let investor = &ctx.accounts.investor;
    let investment_destination = &ctx.accounts.investment_destination;
    let system_program = &ctx.accounts.system_program;

    // check if has a valid max_ticket_amount
    if invest_args.ticket_amount > invest_args.max_ticket_amount {
        return Err(KyuPadError::InvalidTotalInvestment.into());
    }

    // Check if in the time allow
    let clock = Clock::get()?;
    let current_timestamp = clock.unix_timestamp;
    if current_timestamp < project.start_date || current_timestamp > project.end_date {
        return Err(KyuPadError::NotInvestTime.into());
    }

    // check if have enough ticket to invest
    if project_counter.remainning <= 0 {
        return Err(KyuPadError::ProjectOutOfTicket.into());
    }

    let binding = investor_counter.to_account_info();
    let mut __data: &[u8] = &binding.try_borrow_data()?;
    let mut __disc_bytes = [0u8; 8];
    __disc_bytes.copy_from_slice(&__data[..8]);
    let __discriminator = u64::from_le_bytes(__disc_bytes);

    // check if user is enough ticket to invest
    if __discriminator != 0 {
        if invest_args.ticket_amount > investor_counter.remainning {
            return Err(KyuPadError::NotEnoughTicket.into());
        }
    } else {
        investor_counter.remainning = invest_args.max_ticket_amount;
        investor_counter.wallet = *investor.key;
        investor_counter.project_id = invest_args.project_id;
    }

    // check if user have right to invest
    let leaf = solana_program::keccak::hashv(&[(investor.key().to_string()
        + "_"
        + &invest_args.max_ticket_amount.to_string())
        .as_bytes()]);

    // check if this address is allow to mint
    match verify(
        &invest_args.merkle_proof[..],
        project.merkle_root.as_slice().try_into().unwrap(),
        &leaf.0,
    ) {
        false => return Err(KyuPadError::InvalidWallet.into()),
        true => {
            let transfer_result: std::prelude::v1::Result<(), ProgramError>;

            match project.token_address {
                Some(token_address) => {
                    let list_remainning_accounts = &mut ctx.remaining_accounts.iter();
                    let token_program = next_account_info(list_remainning_accounts)?;
                    let mint = next_account_info(list_remainning_accounts)?;
                    let source = next_account_info(list_remainning_accounts)?;

                    let mint_data: Account<Mint> = Account::try_from(mint)?;

                    // validate mint key
                    assert_keys_equal(&mint.key(), &token_address)?;

                    // validate source key
                    let source_key = get_associated_token_address_with_program_id(
                        &investor.key,
                        &mint.key,
                        &token_program.key,
                    );
                    assert_keys_equal(&source.key(), &source_key)?;

                    transfer_result = invoke(
                        &transfer_checked(
                            token_program.key,
                            &source.key(),
                            &mint.key(),
                            &investment_destination.key(),
                            investor.key,
                            &[],
                            project.ticket_size * invest_args.ticket_amount as u64,
                            mint_data.decimals,
                        )
                        .unwrap(),
                        &[
                            token_program.to_account_info(),
                            source.to_account_info(),
                            mint.to_account_info(),
                            investment_destination.to_account_info(),
                            investor.to_account_info(),
                        ],
                    );
                }
                None => {
                    transfer_result = invoke(
                        &system_instruction::transfer(
                            &investor.key(),
                            &investment_destination.key(),
                            project.ticket_size * invest_args.ticket_amount as u64,
                        ),
                        &[
                            investor.to_account_info().clone(),
                            investment_destination.to_account_info(),
                            system_program.to_account_info(),
                        ],
                    );
                }
            }

            match transfer_result {
                Ok(_) => {
                    // calculate remainning ticket for project's counter and investor's counter
                    project_counter.remainning -= invest_args.ticket_amount as u32;
                    investor_counter.remainning -= invest_args.ticket_amount;
                }
                Err(_) => return Err(KyuPadError::TransferIsError.into()),
            }
        }
    };

    Ok(())
}

#[derive(Accounts)]
#[instruction(invest_args: InvestArgs)]
pub struct Invest<'info> {
    #[account(mut)]
    pub investor: Signer<'info>,

    #[account(
        seeds = [ProjectConfig::PREFIX_SEED, invest_args.project_id.as_bytes()],
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
        payer = investor,
        space = 8 + InvestorCounter::INIT_SPACE,
        seeds = [InvestorCounter::PREFIX_SEED, project.key().as_ref(), investor.key().as_ref()],
        bump
    )]
    pub investor_counter: Account<'info, InvestorCounter>,

    #[account(mut)]
    /// CHECK:
    pub investment_destination: AccountInfo<'info>,

    // pub token_program: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Debug, AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct InvestArgs {
    #[max_len(24)]
    pub project_id: String,

    pub ticket_amount: u8,

    pub max_ticket_amount: u8,

    #[max_len(16)]
    pub merkle_proof: Vec<[u8; 32]>,
}
