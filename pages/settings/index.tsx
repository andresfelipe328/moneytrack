import Head from 'next/head'

import BasicLayout from '@/components/layouts/BasicLayout'

export default function Settings() {
  return (
    <>
      <Head>
        <title>Settings</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <BasicLayout>
         <h1>Settings</h1>
      </BasicLayout>
    </>
  )
}