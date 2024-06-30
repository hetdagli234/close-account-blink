import { ACTIONS_CORS_HEADERS, ActionGetResponse, ActionPostRequest, ActionError, createPostResponse, MEMO_PROGRAM_ID, ActionPostResponse } from "@solana/actions"
import { Connection, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js"
import { getTokenAccounts } from "../tokenAccounts"
import { createCloseAccountInstruction } from "@solana/spl-token"
require('dotenv').config();

export const GET = (req: Request) => {
    const payload: ActionGetResponse = {
        icon: new URL("/cleanRent.jpeg", new URL(req.url).origin).toString(),
        label: "Reclaim Rent",
        description: "On Solana, token accounts require a small amount of rent (in SOL) to be stored on the blockchain. For empty token accounts, you can close them to reclaim this rent deposit, usually around 0.002 SOL per account, and have it credited back to your main SOL wallet.",
        title: "Reclaim rent from all the empty token accounts"
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

        console.log(`${zeroAccounts.length} zero token accounts found`)

        if(zeroAccounts.length>25){
            zeroAccounts = zeroAccounts.slice(0, 25)
            accountOverflowFlag = true
        }

        try{
            zeroAccounts.forEach((zeroAccount) => {
            transaction.add(createCloseAccountInstruction(zeroAccount.pubkey, account, account));
        })
        } catch(e){
            console.log(`Failed adding instruction ${e}`)
        }

        let message = ''

        if(accountOverflowFlag){
            message = `Congrats you just claimed rent for 25 zero token accounts, there are still ${leftLength} accounts left to be claimed`
        }
        else{
            message = `You just cleared ${zeroAccounts.length} zero token accounts.`
        }
        transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        const payload: ActionPostResponse = await createPostResponse({
            fields: {
                transaction,
                message: message
            }
        })

        return Response.json(payload, { headers: ACTIONS_CORS_HEADERS})
    } catch(err){
        return Response.json(`unkown error ${err}`, { status: 400})
    }
}