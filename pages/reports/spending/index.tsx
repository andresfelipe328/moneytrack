import Head from 'next/head'

import BasicLayout from '@/components/layouts/BasicLayout'
import NotificationItem from '@/components/notifications/NotificationItem'

import nookies from 'nookies'
import { verifyIDToken } from '@/config/firebaseadmin'
import { GetServerSidePropsContext } from 'next'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/config/firebase'
import { Transaction } from 'plaid'
import { client } from '@/config/plaid'
import { roundValue } from '@/utils/helperFuncts'
import TxnMore from '@/components/popups/TxnMore'

type Props = {
  spending: Transaction[]
}

export default function SpendingReport({spending}: Props) {
  return (
    <>
      <Head>
        <title>Spending Report</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <BasicLayout>
        <h1>Spending Report</h1>
        { spending.length > 0
              ?
                <ul className="w-[75%] sm-width:w-full mx-auto flex flex-col gap-2">
                  {spending.map((transaction) => (
                    <li key={transaction.transaction_id} className="overflow-hidden flex items-center gap-10 p-2 rounded-md bg-secondary-dark/[25%] hover:simple-hover">
                      <div className="flex flex-col flex-1 truncate">
                        <h2 className="font-bold truncate">{transaction.merchant_name || transaction.name}</h2>
                        <div className='flex items-center gap-2'>
                            <small>{transaction.date}</small>
                            <small 
                              className={`py-1 px-3 rounded-md shadow-simple-shadow border-2 border-primary-dark text-secondary-light/100`}
                              style={{backgroundColor: !transaction.pending ? 'rgba(21,128,61, .5)' :'rgba(185,28,28,.5)'}}
                            >
                              {transaction.pending ? 'pending' : 'settled'}
                            </small>
                        </div>
                      </div>
            
                      <div className="flex gap-4 items-center">
                        <p className="font-medium">${roundValue(Math.abs(transaction.amount))}</p>
                        <TxnMore/>
                      </div>
                    </li>
                  ))}
                </ul>
              :
                <div className='h-full grid place-items-center'>
                  <p>no bills</p>
                </div>
          }
      </BasicLayout>
    </>
  )
}

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  try {
    const cookies = nookies.get(ctx)
    const token = await verifyIDToken(cookies.token)
    const linkref = doc(db, `users/${token.uid}/linkBankAcc`, 'linkBankAccInfo')
    const linkSnap = await getDoc(linkref)
    let spending:Transaction[] = []
    const dateParams = ctx.resolvedUrl.slice(ctx.resolvedUrl.indexOf('=') + 1).split('-')

    
    if (!linkSnap.exists())
    return {
      redirect: {destination: '/link-bank-account'}
    }
    else {
      const dateReport = new Date(Number(dateParams[0]), Number(dateParams[1]) - 1)
      const todayDate: Date = new Date()
      const access_token = linkSnap.data().accessToken

      const response = await client.accountsBalanceGet({
            access_token
          });
      const accounts = response.data.accounts;
      const omitAcc = ['credit', 'loan']
      let accountIDs:string[] = []

      accounts.forEach((acc:any) => {
      if (!omitAcc.includes(acc.type)) {
          accountIDs.push(acc.account_id)
      }
      })

      const firstMonthDate = new Date(dateReport.getFullYear(), dateReport.getMonth(), 1).toISOString().slice(0, 10)
      const monthlyTranscations = await client.transactionsGet({
      access_token,
      start_date: firstMonthDate,
      end_date: dateReport.getMonth() === todayDate.getMonth() 
          ?
            todayDate.toISOString().slice(0, 10)
          :
            new Date(dateReport.getFullYear(), dateReport.getMonth() + 1, 0).toISOString().slice(0, 10),
      options: {
          account_ids: accountIDs
      }
      });
      let transactions = monthlyTranscations.data.transactions

      while(transactions.length < monthlyTranscations.data.total_transactions) {
        const remainingTransactions = await client.transactionsGet({
          access_token,
          start_date: firstMonthDate,
          end_date: dateReport.getMonth() === todayDate.getMonth() 
            ?
              todayDate.toISOString().slice(0, 10)
            :
              new Date(dateReport.getFullYear(), dateReport.getMonth() + 1, 0).toISOString().slice(0, 10),
          options: {
            offset: transactions.length,
          }
        });
        transactions = transactions.concat(remainingTransactions.data.transactions)
      }
      const omitCategories = ['Transfer', 'Credit Card', 'Deposit', 'Payment', 'Service']
      transactions.reverse().forEach((transactionItem) => {
        if (!omitCategories.some((r) => transactionItem.category!.indexOf(r) >= 0) && 
              !omitCategories.some((r) => transactionItem.name.indexOf(r) >= 0)) {
          spending.push(transactionItem)
        }
      })
    }
    return {
      props: {
        spending
      }
    }

  } catch(err) {
      return {
        redirect: {destination: '/login'}
      }
  }
}