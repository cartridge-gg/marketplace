pub const FEE_NUMERATOR: u16 = 5;
pub const FEE_DENOMINATOR: u16 = 100;

pub fn FEE_RECEIVER() -> starknet::ContractAddress {
    starknet::contract_address_const::<
        0x041aad5a7493b75f240f418cb5f052d1a68981af21e813ed0a35e96d3e83123b,
    >()
}

pub fn NAMESPACE() -> ByteArray {
    "MARKETPLACE"
}
