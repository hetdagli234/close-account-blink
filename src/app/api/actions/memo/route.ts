import { ACTIONS_CORS_HEADERS, ActionGetResponse, ActionPostRequest, ActionError, createPostResponse, MEMO_PROGRAM_ID, ActionPostResponse } from "@solana/actions"
import { Connection, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js"
import { getTokenAccounts } from "../tokenAccounts"
import { createCloseAccountInstruction } from "@solana/spl-token"
require('dotenv').config();

export const GET = (req: Request) => {
    const payload: ActionGetResponse = {
        icon: new URL("/cleanRent.jpeg", new URL(req.url).origin).toString(),
        label: "Reclaim Rent",
        description: "Earn free money from your own wallet accounts. Yes! Reclaim your rent deposit from your empty token accounts, which is paid during token account creation (usually ~0.002 SOL or ~$0.3). Have it credited back to your main SOL account.",
        title: "Close Token Accounts with 0 Balance"
    }

    return Response.json(payload, {
        headers: ACTIONS_CORS_HEADERS
    })
}

export const OPTIONS = GET;

export const POST = async (req: Request) => {
    try{
        const body: ActionPostRequest = await req.json();

        let account: PublicKey;

        const rpcUrl = process.env.RPC_URL;
        if (!rpcUrl) {
            return new Response('RPC_URL is not defined in environment variables', {
                status: 500,
                headers: ACTIONS_CORS_HEADERS
            });
        }

        const connection = new Connection(rpcUrl);

        try{
            account = new PublicKey(body.account);
        } catch (err) {
            return new Response('invalid account provided', {
                status: 400,
                headers: ACTIONS_CORS_HEADERS
            })
        }

        console.log(`Key verification succeeded ${account}`);

        let zeroAccounts = await getTokenAccounts(account, connection)

        if(zeroAccounts.length == 0){
            const payload: ActionError = {
                message: "No zero token accounts found"
            }
            return Response.json(payload, {
                status: 400,
                headers: ACTIONS_CORS_HEADERS
            })
        }

        const transaction: Transaction = new Transaction();
        transaction.feePayer = account;

        let accountOverflowFlag = false

        const leftLength = zeroAccounts.length - 25

        // console.log(`${zeroAccounts.length} zero token accounts found`)

        // if(zeroAccounts.length>25){
        //     zeroAccounts = zeroAccounts.slice(0, 25)
        //     accountOverflowFlag = true
        // }

        // try{
        //     zeroAccounts.forEach((zeroAccount) => {
        //     transaction.add(createCloseAccountInstruction(zeroAccount.pubkey, account, account));
        // })
        // } catch(e){
        //     console.log(`Failed adding instruction ${e}`)
        // }

        let recentBlockhash = (await connection.getLatestBlockhash()).blockhash

        const transactions: Transaction[] = [];

        chunks(zeroAccounts).forEach((chunk) => {
            // New empty transaction
            const txn = new Transaction();
            txn.feePayer = account;
            txn.recentBlockhash = recentBlockhash;
            for (const singleAccount of chunk) {
              // Add a `closeAccount` instruction for every token account in the chunk
              txn.add(createCloseAccountInstruction(singleAccount.pubkey, account, account));
            }
            transactions.push(txn);
          });

        let message = ''

        if(accountOverflowFlag){
            message = `Congrats you just claimed rent for 25 zero balance token accounts, there are still ${leftLength} accounts left to be claimed`
        }
        else{
            message = `You just cleared ${zeroAccounts.length} zero balance token accounts.`
        }
        transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        // const payload: ActionPostResponse = await createPostResponse({
        //     fields: {
        //         transaction,
        //         message: message
        //     }
        // })
        const payload = {
            fields: {
                transaction: Buffer.from(transactions.map(t => t.serialize()).join('')).toString(
                    "base64"
                  ),
                message: message
            }
        }

        return Response.json(payload, { headers: ACTIONS_CORS_HEADERS})
    } catch(err){
        return Response.json(`unkown error ${err}`, { status: 400})
    }
}

// Split an array into chunks of length `chunkSize`
const chunks = <T>(array: T[], chunkSize = 10): T[][] => {
    let res: T[][] = [];
    for (let currentChunk = 0; currentChunk < array.length; currentChunk += chunkSize) {
      res.push(array.slice(currentChunk, currentChunk + chunkSize));
    }
    return res;
  };