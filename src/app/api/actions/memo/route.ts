import { ACTIONS_CORS_HEADERS, ActionGetResponse, ActionPostRequest, ActionError, createPostResponse, MEMO_PROGRAM_ID, ActionPostResponse } from "@solana/actions"
import { Connection, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js"
import { getTokenAccounts } from "../tokenAccounts"
import { createCloseAccountInstruction } from "@solana/spl-token"
require('dotenv').config();

export const GET = (req: Request) => {
    const payload: ActionGetResponse = {
        icon: new URL("/clean_image.jpeg", new URL(req.url).origin).toString(),
        label: "Sign txn and Claim",
        description: "Reclaim your rent deposit from your empty token accounts (tokens with 0 balance), which is paid during token account creation (usually ~0.002 SOL or ~$0.3). Have it credited back to your main SOL account.",
        title: "Close Token Accounts with 0 Balance"
    }

    const metaTag = `<meta property="twitter:image" content="${payload.icon}" />`;

    return Response.json(payload, {
        headers: {
        ...ACTIONS_CORS_HEADERS,
        "Content-Type": "application/json",
        "X-Meta-Tags": metaTag
        }
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
            message = `🎉 🥳 ${25*0.002} SOL claimed by closing 25 accounts, there are still appx ${leftLength*0.002} SOL left to be claimed. Refresh the page and claim again.`
        }
        else{
            message = `${zeroAccounts.length} zero balance token accounts cleared receiving ${zeroAccounts.length*0.002} SOL.`
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