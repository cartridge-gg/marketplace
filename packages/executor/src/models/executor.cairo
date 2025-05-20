// Imports

use core::num::traits::Zero;
use executor::models::index::Executor;

// Constants

pub const MAX_DENOMINATOR: u16 = 10_000;

// Errors

pub mod errors {
    pub const Executor_INVALID_ID: felt252 = 'Executor: invalid id';
    pub const Executor_INVALID_NUMERATOR: felt252 = 'Executor: invalid numerator';
    pub const Executor_INVALID_DENOMINATOR: felt252 = 'Executor: invalid denominator';
}

#[generate_trait]
pub impl ExecutorImpl of ExecutorTrait {
    #[inline]
    fn new(id: felt252, numerator: u16, denominator: u16, receiver: felt252) -> Executor {
        // [Check] Inputs
        ExecutorAssert::assert_valid_id(id);
        ExecutorAssert::assert_valid_ratio(numerator, denominator);
        // [Return] Executor
        Executor { id, numerator, denominator, receiver }
    }

    #[inline]
    fn compute(self: @Executor, value: u256) -> u256 {
        (value * (*self.numerator).into()) / (*self.denominator).into()
    }

    #[inline]
    fn update_ratio(ref self: Executor, numerator: u16, denominator: u16) {
        // [Check] Inputs
        ExecutorAssert::assert_valid_ratio(numerator, denominator);
        // [Effect] Ratio
        self.numerator = numerator;
        self.denominator = denominator;
    }

    #[inline]
    fn update_receiver(ref self: Executor, receiver: felt252) {
        // [Effect] Receiver
        self.receiver = receiver;
    }

    #[inline]
    fn nullify(ref self: Executor) {
        // [Effect] Nullify
        self.numerator = 0;
    }
}

#[generate_trait]
pub impl ExecutorAssert of AssertTrait {
    #[inline]
    fn assert_valid_id(id: felt252) {
        assert(id.is_non_zero(), errors::Executor_INVALID_ID);
    }

    #[inline]
    fn assert_valid_ratio(numerator: u16, denominator: u16) {
        assert(denominator <= MAX_DENOMINATOR, errors::Executor_INVALID_DENOMINATOR);
        assert(denominator.is_non_zero(), errors::Executor_INVALID_DENOMINATOR);
        assert(numerator < denominator, errors::Executor_INVALID_NUMERATOR);
    }
}


pub impl ExecutorDefault of Default<Executor> {
    #[inline]
    fn default() -> Executor {
        Executor { id: 0, numerator: 0, denominator: 1, receiver: 0 }
    }
}

pub impl ExecutorZero of Zero<Executor> {
    #[inline]
    fn zero() -> Executor {
        Executor { id: 0, numerator: 0, denominator: 0, receiver: 0 }
    }

    #[inline]
    fn is_zero(self: @Executor) -> bool {
        self.numerator == @0
    }

    #[inline]
    fn is_non_zero(self: @Executor) -> bool {
        !self.is_zero()
    }
}


#[cfg(test)]
mod tests {
    // Local imports

    use super::{ExecutorTrait, ExecutorAssert, ExecutorZero, MAX_DENOMINATOR};

    // Constants

    const IDENTIFIER: felt252 = 'IDENTIFIER';
    const NUMERATOR: u16 = 100;
    const DENOMINATOR: u16 = 10_000;
    const RECEIVER: felt252 = 'RECEIVER';

    #[test]
    fn test_Executor_new() {
        let Executor = ExecutorTrait::new(IDENTIFIER, NUMERATOR, DENOMINATOR, RECEIVER);
        assert_eq!(Executor.id, IDENTIFIER);
        assert_eq!(Executor.numerator, NUMERATOR);
        assert_eq!(Executor.denominator, DENOMINATOR);
        assert_eq!(Executor.receiver, RECEIVER);
    }

    #[test]
    fn test_Executor_compute() {
        let Executor = ExecutorTrait::new(IDENTIFIER, NUMERATOR, DENOMINATOR, RECEIVER);
        assert_eq!(Executor.compute(100), 1);
    }

    #[test]
    fn test_Executor_update_ratio() {
        let mut Executor = ExecutorTrait::new(IDENTIFIER, NUMERATOR, DENOMINATOR, RECEIVER);
        let new_numerator = NUMERATOR + 1;
        let new_denominator = DENOMINATOR - 1;
        Executor.update_ratio(new_numerator, new_denominator);
        assert_eq!(Executor.numerator, new_numerator);
        assert_eq!(Executor.denominator, new_denominator);
    }

    #[test]
    fn test_Executor_update_receiver() {
        let mut Executor = ExecutorTrait::new(IDENTIFIER, NUMERATOR, DENOMINATOR, RECEIVER);
        let new_receiver = RECEIVER + 1;
        Executor.update_receiver(new_receiver);
        assert_eq!(Executor.receiver, new_receiver);
    }

    #[test]
    fn test_Executor_nullify() {
        let mut Executor = ExecutorTrait::new(IDENTIFIER, NUMERATOR, DENOMINATOR, RECEIVER);
        Executor.nullify();
        assert_eq!(Executor.is_zero(), true);
    }

    #[test]
    #[should_panic(expected: ('Executor: invalid id',))]
    fn test_Executor_invalid_id() {
        ExecutorTrait::new(0, NUMERATOR, DENOMINATOR, RECEIVER);
    }

    #[test]
    #[should_panic(expected: ('Executor: invalid numerator',))]
    fn test_Executor_invalid_numerator() {
        ExecutorTrait::new(IDENTIFIER, DENOMINATOR + 1, DENOMINATOR, RECEIVER);
    }

    #[test]
    #[should_panic(expected: ('Executor: invalid denominator',))]
    fn test_Executor_invalid_denominator() {
        ExecutorTrait::new(IDENTIFIER, NUMERATOR, MAX_DENOMINATOR + 1, RECEIVER);
    }

    #[test]
    #[should_panic(expected: ('Executor: invalid denominator',))]
    fn test_Executor_null_denominator() {
        ExecutorTrait::new(IDENTIFIER, NUMERATOR, 0, RECEIVER);
    }
}

