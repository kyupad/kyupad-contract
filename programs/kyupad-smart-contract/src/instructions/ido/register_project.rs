use anchor_lang::prelude::*;

use crate::*;

use self::errors::KyuPadError;

pub fn register_project(
    ctx: Context<RegisterProject>,
    project_config_args: ProjectConfigArgs,
) -> Result<()> {
    let admin_pda = &ctx.accounts.admin_pda;

    // Check that admin have right to register project
    let has_ido_admin = admin_pda
        .permissions
        .iter()
        .any(|permission| matches!(permission, Permission::IdoAdmin));

    if !has_ido_admin {
        return Err(KyuPadError::DontHaveRight.into());
    }

    let project = &mut ctx.accounts.project;
    project.id = project_config_args.id;
    project.start_date = project_config_args.start_date;
    project.end_date = project_config_args.end_date;
    project.merkle_root = project_config_args.merkle_root;
    project.destination = project_config_args.destination;
    project.token_address = project_config_args.token_address;
    project.ticket_size = project.ticket_size;

    Ok(())
}

#[derive(Accounts)]
#[instruction(project_config_args: ProjectConfigArgs)]
pub struct RegisterProject<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        seeds=[b"admin", creator.key().as_ref()],  
        bump
    )]
    pub admin_pda: Account<'info, Admin>,

    #[account(
        init_if_needed,
        payer = creator,
        space = 8 + ProjectConfig::INIT_SPACE,
        seeds = [ProjectConfig::PREFIX_SEED, project_config_args.id.as_bytes()],
        bump
    )]
    pub project: Account<'info, ProjectConfig>,

    pub system_program: Program<'info, System>,
}
