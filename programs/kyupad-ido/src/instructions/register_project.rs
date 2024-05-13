use anchor_lang::prelude::*;
use spl_associated_token_account::get_associated_token_address_with_program_id;

use crate::*;

use self::utils::assert_keys_equal;

pub fn register_project<'c: 'info, 'info>(
    ctx: Context<'_, '_, 'c, 'info, RegisterProject<'info>>,
    project_config_args: ProjectConfigArgs,
) -> Result<()> {
    let project = &mut ctx.accounts.project;
    let receiver = &mut ctx.accounts.receiver;

    project.id = project_config_args.id;
    project.start_date = project_config_args.start_date;
    project.end_date = project_config_args.end_date;
    project.merkle_root = project_config_args.merkle_root;
    project.token_address = project_config_args.token_address;
    project.ticket_size = project_config_args.ticket_size;
    project.token_offered = project_config_args.token_offered;
    project.total_ticket = project_config_args.total_ticket;

    let project_counter = &mut ctx.accounts.project_counter;
    project_counter.remaining = project_config_args.total_ticket;

    match project_config_args.token_address {
        Some(token_address) => {
            let list_remaining_accounts = &mut ctx.remaining_accounts.iter();
            let token_program = next_account_info(list_remaining_accounts)?;
            let mint = next_account_info(list_remaining_accounts)?;

            assert_keys_equal(&mint.key(), &token_address)?;

            let ata = get_associated_token_address_with_program_id(
                &receiver.key,
                &mint.key,
                &token_program.key,
            );

            project.vault_address = ata;
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
        init,
        payer = creator,
        space = 8 + ProjectConfig::INIT_SPACE,
        seeds = [ProjectConfig::PREFIX_SEED, project_config_args.id.as_bytes()],
        bump
    )]
    pub project: Account<'info, ProjectConfig>,

    #[account(
        init,
        payer = creator,
        space = 8 + ProjectCounter::INIT_SPACE,
        seeds = [ProjectCounter::PREFIX_SEED, project.key().as_ref()],
        bump
    )]
    pub project_counter: Account<'info, ProjectCounter>,

    /// CHECK:
    pub receiver: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}
