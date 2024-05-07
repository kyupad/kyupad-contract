use anchor_lang::prelude::*;
use spl_token::{
    instruction::transfer_checked,
    solana_program::{self, program::invoke},
};

use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::*;

use self::{errors::KyuPadError, utils::verify};

pub fn invest(ctx: Context<Invest>, invest_args: InvestArgs) -> Result<()> {
    let project_counter = &mut ctx.accounts.project_counter;
    let project = &ctx.accounts.project;
    let investor_counter = &mut ctx.accounts.investor_counter;
    let investor = &ctx.accounts.investor;
    let token_program = &ctx.accounts.token_program;
    let mint = &ctx.accounts.mint;
    let source = &ctx.accounts.source;
    let destination = &ctx.accounts.destination;

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
        msg!(
            "{} {}",
            invest_args.invest_total,
            investor_counter.remainning
        );
        if invest_args.invest_total > investor_counter.remainning {
            return Err(KyuPadError::NotEnoughTicket.into());
        }
    } else {
        investor_counter.remainning = invest_args.invest_max_total;
        if invest_args.invest_total > invest_args.invest_max_total {
            return Err(KyuPadError::InvestTotalInvalid.into());
        }
    }

    // check if user have right to invest
    let leaf = solana_program::keccak::hashv(&[(investor.key().to_string()
        + "_"
        + &invest_args.invest_max_total.to_string())
        .as_bytes()]);

    // check if this address is allow to mint
    match verify(
        &invest_args.merkle_proof[..],
        project.merkle_root.as_slice().try_into().unwrap(),
        &leaf.0,
    ) {
        false => return Err(KyuPadError::InvalidWallet.into()),
        true => {
            project_counter.remainning -= invest_args.invest_total as u32;
            investor_counter.remainning -= invest_args.invest_total;

            let transfer_ins = transfer_checked(
                token_program.key,
                &source.key(),
                &mint.key(),
                &destination.key(),
                investor.key,
                &[],
                project.ticket_size * invest_args.invest_total as u64,
                mint.decimals,
            )
            .unwrap();

            invoke(
                &transfer_ins,
                &[
                    token_program.to_account_info(),
                    source.to_account_info(),
                    mint.to_account_info(),
                    destination.to_account_info(),
                    investor.to_account_info(),
                ],
            )?;
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
        bump
    )]
    pub project: Account<'info, ProjectConfig>,

    #[account(
        mut,
        seeds = [ProjectCounter::PREFIX_SEED, project.key().as_ref()],
        bump
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
    pub mint: Account<'info, Mint>,

    #[account(mut)]
    pub source: Account<'info, TokenAccount>,

    #[account(mut)]
    pub destination: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Debug, AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct InvestArgs {
    #[max_len(24)]
    pub project_id: String,

    pub invest_total: u8,

    pub invest_max_total: u8,

    #[max_len(16)]
    pub merkle_proof: Vec<[u8; 32]>,
}
