// Imports

use core::num::traits::Zero;
use executor::models::index::Fee;

// Constants

pub const MAX_DENOMINATOR: u16 = 10_000;

// Errors

pub mod errors {
    pub const FEE_INVALID_ID: felt252 = 'Fee: invalid id';
    pub const FEE_INVALID_NUMERATOR: felt252 = 'Fee: invalid numerator';
    pub const FEE_INVALID_DENOMINATOR: felt252 = 'Fee: invalid denominator';
}

#[generate_trait]
pub impl FeeImpl of FeeTrait {
    #[inline]
    fn new(id: felt252, numerator: u16, denominator: u16, receiver: felt252) -> Fee {
        // [Check] Inputs
        FeeAssert::assert_valid_id(id);
        FeeAssert::assert_valid_ratio(numerator, denominator);
        // [Return] Fee
        Fee { id, numerator, denominator, receiver }
    }

    #[inline]
    fn compute(self: @Fee, value: u256) -> u256 {
        (value * (*self.numerator).into()) / (*self.denominator).into()
    }

    #[inline]
    fn update_ratio(ref self: Fee, numerator: u16, denominator: u16) {
        // [Check] Inputs
        FeeAssert::assert_valid_ratio(numerator, denominator);
        // [Effect] Ratio
        self.numerator = numerator;
        self.denominator = denominator;
    }

    #[inline]
    fn update_receiver(ref self: Fee, receiver: felt252) {
        // [Effect] Receiver
        self.receiver = receiver;
    }

    #[inline]
    fn nullify(ref self: Fee) {
        // [Effect] Nullify
        self.numerator = 0;
    }
}

#[generate_trait]
pub impl FeeAssert of AssertTrait {
    #[inline]
    fn assert_valid_id(id: felt252) {
        assert(id.is_non_zero(), errors::FEE_INVALID_ID);
    }

    #[inline]
    fn assert_valid_ratio(numerator: u16, denominator: u16) {
        assert(denominator <= MAX_DENOMINATOR, errors::FEE_INVALID_DENOMINATOR);
        assert(denominator.is_non_zero(), errors::FEE_INVALID_DENOMINATOR);
        assert(numerator < denominator, errors::FEE_INVALID_NUMERATOR);
    }
}


pub impl FeeDefault of Default<Fee> {
    #[inline]
    fn default() -> Fee {
        Fee { id: 0, numerator: 0, denominator: 1, receiver: 0 }
    }
}

pub impl FeeZero of Zero<Fee> {
    #[inline]
    fn zero() -> Fee {
        Fee { id: 0, numerator: 0, denominator: 0, receiver: 0 }
    }

    #[inline]
    fn is_zero(self: @Fee) -> bool {
        self.numerator == @0
    }

    #[inline]
    fn is_non_zero(self: @Fee) -> bool {
        !self.is_zero()
    }
}


#[cfg(test)]
mod tests {
    // Local imports

    use super::{FeeTrait, FeeAssert, FeeZero, MAX_DENOMINATOR};

    // Constants

    const IDENTIFIER: felt252 = 'IDENTIFIER';
    const NUMERATOR: u16 = 100;
    const DENOMINATOR: u16 = 10_000;
    const RECEIVER: felt252 = 'RECEIVER';

    #[test]
    fn test_fee_new() {
        let fee = FeeTrait::new(IDENTIFIER, NUMERATOR, DENOMINATOR, RECEIVER);
        assert_eq!(fee.id, IDENTIFIER);
        assert_eq!(fee.numerator, NUMERATOR);
        assert_eq!(fee.denominator, DENOMINATOR);
        assert_eq!(fee.receiver, RECEIVER);
    }

    #[test]
    fn test_fee_compute() {
        let fee = FeeTrait::new(IDENTIFIER, NUMERATOR, DENOMINATOR, RECEIVER);
        assert_eq!(fee.compute(100), 1);
    }

    #[test]
    fn test_fee_update_ratio() {
        let mut fee = FeeTrait::new(IDENTIFIER, NUMERATOR, DENOMINATOR, RECEIVER);
        let new_numerator = NUMERATOR + 1;
        let new_denominator = DENOMINATOR - 1;
        fee.update_ratio(new_numerator, new_denominator);
        assert_eq!(fee.numerator, new_numerator);
        assert_eq!(fee.denominator, new_denominator);
    }

    #[test]
    fn test_fee_update_receiver() {
        let mut fee = FeeTrait::new(IDENTIFIER, NUMERATOR, DENOMINATOR, RECEIVER);
        let new_receiver = RECEIVER + 1;
        fee.update_receiver(new_receiver);
        assert_eq!(fee.receiver, new_receiver);
    }

    #[test]
    fn test_fee_nullify() {
        let mut fee = FeeTrait::new(IDENTIFIER, NUMERATOR, DENOMINATOR, RECEIVER);
        fee.nullify();
        assert_eq!(fee.is_zero(), true);
    }

    #[test]
    #[should_panic(expected: ('Fee: invalid id',))]
    fn test_fee_invalid_id() {
        FeeTrait::new(0, NUMERATOR, DENOMINATOR, RECEIVER);
    }

    #[test]
    #[should_panic(expected: ('Fee: invalid numerator',))]
    fn test_fee_invalid_numerator() {
        FeeTrait::new(IDENTIFIER, DENOMINATOR + 1, DENOMINATOR, RECEIVER);
    }

    #[test]
    #[should_panic(expected: ('Fee: invalid denominator',))]
    fn test_fee_invalid_denominator() {
        FeeTrait::new(IDENTIFIER, NUMERATOR, MAX_DENOMINATOR + 1, RECEIVER);
    }

    #[test]
    #[should_panic(expected: ('Fee: invalid denominator',))]
    fn test_fee_null_denominator() {
        FeeTrait::new(IDENTIFIER, NUMERATOR, 0, RECEIVER);
    }
}

