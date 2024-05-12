use anchor_lang::prelude::*;
use spl_associated_token_account::instruction::create_associated_token_account;
use spl_token::solana_program::program::invoke;

use crate::*;

use self::utils::assert_keys_equal;

pub fn register_project<'c: 'info, 'info>(
    ctx: Context<'_, '_, 'c, 'info, RegisterProject<'info>>,
    project_config_args: ProjectConfigArgs,
) -> Result<()> {
    let project = &mut ctx.accounts.project;
    let investment_destination = &mut ctx.accounts.investment_destination;
    let creator = &ctx.accounts.creator;

    project.id = project_config_args.id;
    project.start_date = project_config_args.start_date;
    project.end_date = project_config_args.end_date;
    project.merkle_root = project_config_args.merkle_root;
    project.investment_destination = investment_destination.key();
    project.token_address = project_config_args.token_address;
    project.ticket_size = project_config_args.ticket_size;
    project.token_offered = project_config_args.token_offered;
    project.total_ticket = project_config_args.total_ticket;

    let project_counter = &mut ctx.accounts.project_counter;
    project_counter.remainning = project_config_args.total_ticket;

    match project_config_args.token_address {
        Some(token_address) => {
            let mut __data: &[u8] = &investment_destination.try_borrow_data()?;
            let mut __disc_bytes = [0u8; 8];
            __disc_bytes.copy_from_slice(&__data[..8]);
            let __discriminator = u64::from_le_bytes(__disc_bytes);

            if __discriminator == 0 {
                let token_program = next_account_info(&mut ctx.remaining_accounts.iter())?;
                let mint = next_account_info(&mut ctx.remaining_accounts.iter())?;

                assert_keys_equal(&mint.key(), &token_address)?;

                invoke(
                    &create_associated_token_account(
                        &creator.key,
                        &investment_destination.key,
                        &mint.key,
                        &token_program.key,
                    ),
                    &[
                        creator.to_account_info(),
                        investment_destination.to_account_info(),
                        mint.to_account_info(),
                        token_program.to_account_info(),
                    ],
                )?;
            }
        }
        None => {}
    }

    Ok(())
}

#[derive(Accounts)]
#[instruction(project_config_args: ProjectConfigArgs)]
pub struct RegisterProject<'info> {
    #[account(
        mut,
        constraint = creator.key() == admin_pda.admin_key
    )]
    pub creator: Signer<'info>,

    #[account(
        seeds=[b"admin", creator.key().as_ref()],  
        bump,
        owner = ID,
    )]
    /// CHECK:
    pub admin_pda: Account<'info, Admin>,

    #[account(
        init_if_needed,
        payer = creator,
        space = 8 + ProjectConfig::INIT_SPACE,
        seeds = [ProjectConfig::PREFIX_SEED, project_config_args.id.as_bytes()],
        bump
    )]
    pub project: Account<'info, ProjectConfig>,

    #[account(
        init_if_needed,
        payer = creator,
        space = 8 + ProjectCounter::INIT_SPACE,
        seeds = [ProjectCounter::PREFIX_SEED, project.key().as_ref()],
        bump
    )]
    pub project_counter: Account<'info, ProjectCounter>,

    /// CHECK:
    pub investment_destination: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}
