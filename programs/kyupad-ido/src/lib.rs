use anchor_lang::prelude::*;
use instructions::*;
use state::*;

pub mod errors;
pub mod instructions;
pub mod state;
pub mod utils;

#[macro_use]
extern crate dotenv_codegen;
use const_str_to_pubkey::str_to_pubkey;

const PROGRAM_ID: Pubkey = str_to_pubkey(dotenv!("IDO_PROGRAM_ID"));
declare_id!(PROGRAM_ID);

#[program]
pub mod kyupad_ido {
    use super::*;

    pub fn register_project<'c: 'info, 'info>(
        ctx: Context<'_, '_, 'c, 'info, RegisterProject<'info>>,
        project_config_args: ProjectConfigArgs,
    ) -> Result<()> {
        instructions::register_project(ctx, project_config_args)
    }

    pub fn invest<'c: 'info, 'info>(
        ctx: Context<'_, '_, 'c, 'info, Invest<'info>>,
        invest_args: InvestArgs,
    ) -> Result<()> {
        instructions::invest(ctx, invest_args)
    }

    pub fn add_admin(ctx: Context<AddAdmin>, address: Pubkey) -> Result<()> {
        instructions::add_admin(ctx, address)
    }

    pub fn delete_admin(ctx: Context<DeleteAdmin>, address: Pubkey) -> Result<()> {
        instructions::delete_admin(ctx, address)
    }

    pub fn init_master(ctx: Context<InitMaster>, address: Pubkey) -> Result<()> {
        instructions::init_master(ctx, address)
    }

    pub fn transfer_master_rights(
        ctx: Context<TransferMasterRights>,
        new_master_address: Pubkey,
    ) -> Result<()> {
        instructions::transfer_master_rights(ctx, new_master_address)
    }
}
