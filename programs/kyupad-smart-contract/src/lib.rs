#[macro_use]
extern crate dotenv_codegen;

use anchor_lang::prelude::*;
use instructions::*;

use const_str_to_pubkey::str_to_pubkey;

pub mod errors;
pub mod instructions;
pub mod pda;
pub mod state;
pub mod utils;

const PROGRAM_ID: Pubkey = str_to_pubkey(dotenv!("PROGRAM_ID"));
declare_id!(PROGRAM_ID);

#[program]
pub mod kyupad_smart_contract {

    use super::*;

    pub fn init_admin(ctx: Context<InitAdmin>, address: Pubkey) -> Result<()> {
        instructions::init_admin(ctx, address)
    }

    pub fn mint_cnft<'c: 'info, 'info>(
        ctx: Context<'_, '_, 'c, 'info, MintcNFT<'info>>,
        merkle_proof: Vec<[u8; 32]>,
        pool_id: String,
        data: Vec<u8>,
    ) -> Result<()> {
        instructions::mint_cft(ctx, merkle_proof, pool_id, data)
    }

    pub fn init_collection_config<'c: 'info, 'info>(
        ctx: Context<'_, '_, 'c, 'info, InitCollectionConfig<'info>>,
        init_collection_config_args: InitCollectionConfigArgs,
    ) -> Result<()> {
        instructions::init_collection_config(ctx, init_collection_config_args)
    }

    pub fn update_pool_config(
        ctx: Context<UpdatePoolConfig>,
        args: UpdatePoolConfigArgs,
    ) -> Result<()> {
        instructions::update_pool_config(ctx, args)
    }

    pub fn create_collection(ctx: Context<CreateCollection>, data: Vec<u8>) -> Result<()> {
        instructions::create_collection(ctx, data)
    }

    pub fn create_tree_config(
        ctx: Context<CreateTree>,
        max_depth: u32,
        max_buffer_size: u32,
        public: Option<bool>,
        tree_space: u32,
    ) -> Result<()> {
        instructions::create_tree_config(ctx, max_depth, max_buffer_size, public, tree_space)
    }

    pub fn add_pool_config<'c: 'info, 'info>(
        ctx: Context<'_, '_, 'c, 'info, AddPoolConfig<'info>>,
        pool_config_args: PoolConfigArgs,
    ) -> Result<()> {
        instructions::add_pool_config(ctx, pool_config_args)
    }
}
