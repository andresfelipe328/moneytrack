import Head from 'next/head'
import {useEffect} from 'react'
import { GetServerSidePropsContext } from 'next'

import BasicLayout from '@/components/layouts/BasicLayout'
import LinkBank from '@/components/linkBank/LinkBank'

import nookies from 'nookies'
import { verifyIDToken } from '@/config/firebaseadmin'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/config/firebase'

type Props = {
   userID: string
}

export default function LinkBankAccount({userID}: Props) {
   return (
      <>
         <Head>
         <title>Link Bank Account</title>
         <meta name="description" content="Generated by create next app" />
         <meta name="viewport" content="width=device-width, initial-scale=1" />
         <link rel="icon" href="/favicon.ico" />
         </Head>
         <BasicLayout>
            <div className='h-full flex flex-col items-center justify-center'>
               <h1>Link Bank Account</h1>
               <LinkBank userID={userID}/>
            </div>
         </BasicLayout>
      </>
   )
}

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
   try {
      const cookies = nookies.get(ctx)
      const token = await verifyIDToken(cookies.token)

      if (token) {
         const docRef = doc(db, `users/${token.uid}/linkBankAcc`, 'linkBankAccInfo')
         const docSnap = await getDoc(docRef)

         if (docSnap.exists())
            return {
               redirect: {destination: '/'}
            }
      }
      
      return {
       props: {userID: token.uid}
    }
 
   } catch(err) {
      console.log(err)
      return {
         redirect: {destination: '/login'}
      }
   }
}