import { Connection, GetProgramAccountsFilter, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

async function getTokenAccounts(wallet: PublicKey, solanaConnection: Connection) {

    const accounts = await solanaConnection.getParsedTokenAccountsByOwner(wallet, { programId: TOKEN_PROGRAM_ID });

    const zeroAccounts = accounts.value.filter(account => account.account.data.parsed.info.tokenAmount.uiAmount === 0);

    console.log(`Zero accounts ${zeroAccounts}`)

    return zeroAccounts
}

export { getTokenAccounts } 