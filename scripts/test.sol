// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleStorage {
    // State variable to store a number
    uint256 public favoriteNumber;

    // Function to update the number
    function set(uint256 _number) public {
        favoriteNumber = _number;
    }

    // Function to read the number (automatically created by 'public')
    function get() public view returns (uint256) {
        return favoriteNumber;
    }
}
