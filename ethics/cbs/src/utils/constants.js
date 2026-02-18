/**
 * Crypto Payment Configuration
 * Defines supported networks, wallet addresses, and asset paths.
 */

export const CRYPTO_NETWORKS = {
    BTC: {
        id: 'BTC',
        name: 'Bitcoin',
        networkName: 'Bitcoin Network',
        address: 'bc1qp4ay29x85hd4nc4r3e95kvfzert3ytpkjd0u25',
        qrImage: '/assets/crypto/qr-btc.png',
        bgClass: 'bg-orange-500/20 border-orange-500 text-orange-400',
        icon: 'fa-brands fa-bitcoin'
    },
    TRC: {
        id: 'TRC',
        name: 'USDT (TRC20)',
        networkName: 'TRON Network',
        address: 'TAusgLjKphehNnyeDzfBpCLP2zVLqcnAGG',
        qrImage: '/assets/crypto/qr-trc.png',
        bgClass: 'bg-green-500/20 border-green-500 text-green-400',
        icon: 'fa-solid fa-t'
    },
    ERC: {
        id: 'ERC',
        name: 'USDT (ERC20)',
        networkName: 'Ethereum Network',
        address: '0x7b1ba2e7729d9117EEAE87CB8141c0E3b13657Fb',
        qrImage: '/assets/crypto/qr-erc.png',
        bgClass: 'bg-purple-500/20 border-purple-500 text-purple-400',
        icon: 'fa-brands fa-ethereum'
    }
};

export const DEFAULT_NETWORK = 'TRC';
