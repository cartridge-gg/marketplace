#[derive(Copy, Drop, PartialEq)]
pub enum Status {
    None,
    Pause,
}

// Implementations

pub impl IntoStatusU8 of core::traits::Into<Status, u8> {
    #[inline]
    fn into(self: Status) -> u8 {
        match self {
            Status::None => 0,
            Status::Pause => 1,
        }
    }
}

pub impl IntoU8Status of core::traits::Into<u8, Status> {
    #[inline]
    fn into(self: u8) -> Status {
        match self {
            0 => Status::None,
            1 => Status::Pause,
        }
    }
}
