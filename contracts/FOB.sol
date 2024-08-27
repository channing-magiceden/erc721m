// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "./ERC721CMRoyalties.sol";
import "erc721a/contracts/extensions/ERC721AQueryable.sol";

error NotSFTOperator();
error NotOwnerOrSFTOperator();

contract FOB is ERC721CMRoyalties {
    address private _sftOperator;

    constructor(
        string memory collectionName,
        string memory collectionSymbol,
        string memory tokenURISuffix,
        uint256 maxMintableSupply,
        uint256 globalWalletLimit,
        address cosigner,
        uint64 timestampExpirySeconds,
        address mintCurrency,
        address fundReceiver,
        address royaltyReceiver,
        uint96 royaltyFeeNumerator,
        address sftOperator
    )
        ERC721CMRoyalties(
            collectionName,
            collectionSymbol,
            tokenURISuffix,
            maxMintableSupply,
            globalWalletLimit,
            cosigner,
            timestampExpirySeconds,
            mintCurrency,
            fundReceiver,
            royaltyReceiver,
            royaltyFeeNumerator
        )
    {
        _sftOperator = sftOperator;
    }

    /**
     * @dev override _safeMint to mint 5x NFTs for specified quantity 1x.
     */
    function _safeMint(
        address to,
        uint256 quantity,
        bytes memory _data
    ) internal override {
        // mint function mints 5 NFTs per 1 quantity
        uint256 newQuantity = quantity * 5;
        super._safeMint(to, newQuantity, _data);
    }

    /**
     * @dev Returns the token id to start from (1).
     */
    function _startTokenId() internal view virtual override returns (uint256) {
        return 1;
    }

    /**
     * @dev Returns the total number of tokens minted.
     */
    function totalMinted() public view returns (uint256) {
        return _totalMinted();
    }

    // SFT operator START
    modifier onlySftOperator() {
        if (msg.sender != _sftOperator) {
            revert NotSFTOperator();
        }
        _;
    }
    modifier onlyOwnerOrSftOperator() {
        if (msg.sender != owner() && msg.sender != _sftOperator) {
            revert NotOwnerOrSFTOperator();
        }
        _;
    }

    /**
     * @dev Mints token(s) by owner.
     *
     * NOTE: This function bypasses validations thus only available for owner.
     * This is typically used for owner to  pre-mint or mint the remaining of the supply.
     */
    function operatorMint(
        uint32 qty,
        address to
    ) external onlySftOperator hasSupply(qty) {
        _safeMint(to, qty);
    }

    /**
     *
     * @dev override totalSupply to return total number of packs minted rather than NFTs.
     * totalMinted() function reflects the actual number of NFTs minted from the packs.
     */
    function totalSupply()
        public
        view
        virtual
        override(ERC721A, IERC721A)
        returns (uint256)
    {
        uint256 nftTotalSupply = super.totalSupply();
        return nftTotalSupply / 5;
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(
        address newOwner
    ) public virtual override onlyOwnerOrSftOperator {
        if (newOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(newOwner);
    }

    function disableSftOperator() external onlySftOperator {
        _sftOperator = address(0);
    }
    // SFT operator END
}