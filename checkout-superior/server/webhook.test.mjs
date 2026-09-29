import test from 'node:test';
import assert from 'node:assert/strict';
import { processStripeEvent, subscriptionPeriods } from './webhook.mjs';

const event = (metadata = {}) => ({id:'evt_test',created:1700000000,type:'payment_intent.succeeded',data:{object:{
  id:'pi_test',created:1699999990,currency:'usd',amount_received:500,customer:'cus_test',payment_method:'pm_test',metadata
}}});
function dependencies() {
  const calls=[];
  return {calls,getAuthorization:async()=>null,markPaid:async(...v)=>calls.push(['paid',...v]),
    upsertProfile:async(...v)=>{calls.push(['profile',...v]); return {id:'profile'};},
    upsertSubscription:async(...v)=>calls.push(['subscription',...v]),
    createSubscription:async(...v)=>calls.push(['create',...v])};
}
test('unrelated successful payment makes no customer or subscription writes',async()=>{
  const d=dependencies(); assert.deepEqual(await processStripeEvent(event(),d),{ignored:true}); assert.equal(d.calls.length,0);
});
test('recognized legacy checkout remains processable',async()=>{
  const d=dependencies(); await processStripeEvent(event({payment_flow:'standard',customer_email:'BUYER@example.com'}),d);
  assert.equal(d.calls[0][1].customerEmail,'buyer@example.com');
});
test('missing authorization fails rather than acknowledges fulfillment',async()=>{
  await assert.rejects(processStripeEvent(event({authorization_id:'missing'}),dependencies()),/authorization is missing/);
});
test('amount mismatch cannot mark authorization paid',async()=>{
  const d=dependencies(); d.getAuthorization=async()=>({id:'auth',totalCents:900,business:{currency:'usd'}});
  await assert.rejects(processStripeEvent(event({authorization_id:'auth'}),d),/does not match/); assert.equal(d.calls.length,0);
});
test('blank email cannot create a profile',async()=>{
  await assert.rejects(processStripeEvent(event({source:'checkout-superior'}),dependencies()),/email/);
});
test('subscription retry schedule is anchored to original payment time',async()=>{
  const d=dependencies(); await processStripeEvent(event({source:'checkout-superior',customer_email:'buyer@example.com',subscription_requested:'true'}),d);
  assert.equal(d.calls.find(c=>c[0]==='create')[1].referenceTimestamp,1699999990);
});
test('database failures propagate for Stripe retry',async()=>{
  const d=dependencies(); d.upsertProfile=async()=>{throw new Error('database offline');};
  await assert.rejects(processStripeEvent(event({source:'checkout-superior',customer_email:'buyer@example.com'}),d),/database offline/);
});
test('Dahlia period dates use subscription items',()=>{
  assert.deepEqual(subscriptionPeriods({items:{data:[{current_period_start:1700000000,current_period_end:1700000100}]}}),
    {currentPeriodStart:new Date(1700000000000).toISOString(),currentPeriodEnd:new Date(1700000100000).toISOString()});
});
test('stale subscription event reconciles current state and inserts missing record',async()=>{
  const d=dependencies(); d.retrieveSubscription=async()=>({id:'sub_test',customer:'cus_test',status:'canceled',
    metadata:{source:'checkout-payment-intent',customer_email:'buyer@example.com'},items:{data:[{price:{id:'price_test',unit_amount:500,currency:'usd',recurring:{interval:'month',interval_count:1}}}]}});
  await processStripeEvent({type:'customer.subscription.updated',data:{object:{id:'sub_test',status:'active',metadata:{source:'checkout-payment-intent'}}}},d);
  assert.equal(d.calls.find(c=>c[0]==='subscription')[1].status,'canceled');
});
