import { ACTIONS_CORS_HEADERS, ActionGetResponse, ActionPostRequest, ActionError, createPostResponse, MEMO_PROGRAM_ID, ActionPostResponse } from "@solana/actions"
import { Connection, PublicKey, Transaction, AddressLookupTableProgram, sendAndConfirmTransaction, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js"
import { getTokenAccounts } from "../tokenAccounts"
import { createCloseAccountInstruction, TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { Instruction } from "@coral-xyz/anchor";
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

        console.log(`${zeroAccounts.length} zero token accounts found`)

        let ixArray: TransactionInstruction[] = [];
        zeroAccounts.forEach((zeroAccount) => {
            ixArray.push(createCloseAccountInstruction(zeroAccount.pubkey, account, account));
        })

        const lookupTableAccount = (
            await connection.getAddressLookupTable(new PublicKey("HVWfyd4kBfCeGfsAvckD5pkrUwUw7kQwpMYGMXMdPpRh"))
          ).value;
        const messageV0 = new TransactionMessage({
            payerKey: account,
            recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
            instructions: ixArray.slice(0, 50), // note this is an array of instructions
          }).compileToV0Message(lookupTableAccount ? [lookupTableAccount] : []);

        const transactionV0 = new VersionedTransaction(messageV0);

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

        let message = ''

        if(accountOverflowFlag){
            message = `Congrats you just claimed rent for 25 zero balance token accounts, there are still ${leftLength} accounts left to be claimed`
        }
        else{
            message = `You just cleared ${zeroAccounts.length} zero balance token accounts.`
        }
        transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        const payload = ({
            fields: {
                transaction: Buffer.from(transactionV0.serialize()).toString(
                    "base64"
                  ),
                message: message
            }
        })

        return Response.json(payload, { headers: ACTIONS_CORS_HEADERS})
    } catch(err){
        return Response.json(`unkown error ${err}`, { status: 400})
    }
}


// import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
// import * as web3 from "@solana/web3.js"

// async function main() {
//     const connection = new web3.Connection("");

//     const slot = await connection.getSlot();
//     const account = web3.Keypair.fromSecretKey(bs58.decode(''))


//     // const [lookupTableInst, lookupTableAddress] =
//     // web3.AddressLookupTableProgram.createLookupTable({
//     //     authority: account.publicKey, 
//     //     payer: account.publicKey,
//     //     recentSlot: slot,
//     // });

//     // console.log("lookup table address:", lookupTableAddress.toBase58());

//     // const lookUpTransaction = new web3.Transaction();
//     // lookUpTransaction.add(lookupTableInst)

//     // await web3.sendAndConfirmTransaction(connection, lookUpTransaction,[account])

//     const permLookUp = new web3.PublicKey("HVWfyd4kBfCeGfsAvckD5pkrUwUw7kQwpMYGMXMdPpRh")

//     const extendInstruction = web3.AddressLookupTableProgram.extendLookupTable({
//         payer: account.publicKey,
//         authority: account.publicKey,
//         lookupTable: permLookUp,
//         addresses: [
//             new web3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
//             new web3.PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")
//         ],
//       });
    
//     const extendTx = new web3.Transaction();

//     extendTx.add(extendInstruction)

//     await web3.sendAndConfirmTransaction(connection, extendTx,[account])
// }

// main()