use anchor_lang::prelude::*;

use instructions::*;

pub mod errors;
pub mod instructions;
pub mod pda;
pub mod state;
pub mod utils;
declare_id!("3LJYEwPqJ5Lk5B9GXYsmadymm7p6hhCKzBeSMBGXJa9L");

#[program]
pub mod kyupad_smart_contract {

    use super::*;

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
    ) -> Result<()> {
        instructions::init_collection_config(ctx)
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
