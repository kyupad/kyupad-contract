use anchor_lang::prelude::*;

use crate::{errors::KyuPadError, utils::*, ID};

use super::BpfWriter;

/// PDA to track the number of mints for an individual address.
#[account]
#[derive(Debug, InitSpace)]
pub struct MintCounter {
    pub count: u8,
}

impl MintCounter {
    /// Prefix used as seed.
    pub const PREFIX_SEED: &'static [u8] = b"mint_counter";

    fn from<'info>(x: &'info AccountInfo<'info>) -> Account<'info, Self> {
        Account::try_from_unchecked(x).unwrap()
    }

    pub fn serialize(&self, info: AccountInfo) -> Result<()> {
        let dst: &mut [u8] = &mut info.try_borrow_mut_data().unwrap();
        let mut writer: BpfWriter<&mut [u8]> = BpfWriter::new(dst);
        MintCounter::try_serialize(self, &mut writer)
    }

    pub fn validate<'info>(
        mint_counter: &'info AccountInfo<'info>,
        minter: AccountInfo<'info>,
        pools: AccountInfo<'info>,
        id: String,
        limit: u8,
    ) -> Result<()> {
        let seeds: &[&[u8]] = &[
            MintCounter::PREFIX_SEED,
            id.as_ref(),
            minter.key.as_ref(),
            pools.key.as_ref(),
        ];

        let (pda, _) = Pubkey::find_program_address(&seeds, &ID);

        assert_keys_equal(&mint_counter.key, &pda)?;

        if !mint_counter.data_is_empty() {
            // check the owner of the account
            assert_owned_by(&mint_counter, &crate::ID)?;

            let mint_counter_ser = MintCounter::from(&mint_counter);

            if mint_counter_ser.count >= limit {
                return err!(KyuPadError::AllowedMintLimitReached);
            }
        } else if limit < 1 {
            // sanity check: if the limit is set to less than 1 we cannot proceed
            return err!(KyuPadError::AllowedMintLimitReached);
        }

        Ok(())
    }

    pub fn increase<'info>(
        mint_counter: &'info AccountInfo<'info>,
        minter: AccountInfo<'info>,
        pools: AccountInfo<'info>,
        system_program: AccountInfo<'info>,
        id: String,
    ) -> Result<()> {
        if mint_counter.data_is_empty() {
            let seeds: &[&[u8]] = &[
                MintCounter::PREFIX_SEED,
                id.as_ref(),
                minter.key.as_ref(),
                pools.key.as_ref(),
            ];

            let (_, bump) = Pubkey::find_program_address(&seeds, &ID);

            create_account(
                system_program,
                minter.clone(),
                mint_counter.clone(),
                seeds,
                bump,
                9,
                &ID,
            )?;
        } else {
            assert_owned_by(&mint_counter, &ID)?;
        }

        let mut mint_counter_ser = MintCounter::from(&mint_counter);
        mint_counter_ser.count += 1;

        mint_counter_ser.serialize(mint_counter_ser.to_account_info())?;

        Ok(())
    }
}
