use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;

use crate::*;

pub fn update_project_config(
    ctx: Context<UpdateProjectConfig>,
    update_config_project: UpdateProjectConfigArgs,
) -> Result<()> {
    let project = &mut ctx.accounts.project;

    project.merkle_root = update_config_project.merkle_root;

    match &update_config_project.invest_total {
        Some(invest_total) => {
            project.invest_total = *invest_total;
        }
        None => {}
    }

    Ok(())
}

pub fn update_destination(ctx: Context<UpdateDestination>, _project_id: String) -> Result<()> {
    let project = &mut ctx.accounts.project;
    let destination = &ctx.accounts.destination;

    project.destination = destination.key();
    Ok(())
}

#[derive(Accounts)]
#[instruction(update_config_project: UpdateProjectConfigArgs)]
pub struct UpdateProjectConfig<'info> {
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
        mut,
        seeds = [ProjectConfig::PREFIX_SEED, update_config_project.project_id.as_bytes()],
        bump,
        owner = ID,
    )]
    pub project: Account<'info, ProjectConfig>,
}

#[derive(Accounts)]
#[instruction(_project_id: String)]
pub struct UpdateDestination<'info> {
    #[account(
        mut,
        constraint = signer.key() == master_pda.master_key
    )]
    pub signer: Signer<'info>,

    #[account(
        seeds = [b"master"],
        bump,       
        owner = ID,

    )]
    pub master_pda: Account<'info, Master>,

    #[account(
        mut,
        seeds = [ProjectConfig::PREFIX_SEED, _project_id.as_bytes()],
        bump,
        owner = ID,
    )]
    pub project: Account<'info, ProjectConfig>,

    pub destination: Account<'info, TokenAccount>,
}

#[derive(Debug, AnchorSerialize, AnchorDeserialize)]
pub struct UpdateProjectConfigArgs {
    pub project_id: String,
    pub merkle_root: Vec<u8>,
    pub invest_total: Option<u32>,
}

#[derive(Debug, AnchorSerialize, AnchorDeserialize)]
pub struct UpdateDestinationArgs {
    pub project_id: String,
    pub destination: Pubkey,
}
