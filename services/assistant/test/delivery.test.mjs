import {test} from 'node:test';
import assert from 'node:assert/strict';
import {findSentMessage, nextDeliveryStep} from '../delivery.mjs';

const since = Date.parse('2026-10-15T12:00:00.000Z');
const recent = Math.floor(since / 1000) + 5;

test('a message already in the chat is the same file and is not sent again', () => {
  const found = findSentMessage([
    {fromMe:false, id:'in', timestamp:recent, filename:'rapor.png', body:'Özet'},
    {fromMe:true, id:{_serialized:'old'}, timestamp:recent - 120, filename:'rapor.png'},
    {fromMe:true, id:{_serialized:'used'}, timestamp:recent, filename:'rapor.png'},
    {fromMe:true, id:{_serialized:'hit'}, timestamp:recent, _data:{filename:'ozet.png'}, body:'Özet', type:'document'},
  ], {fileName:'ozet.png', caption:'Özet', sinceMs:since, usedIds:['used']});
  assert.equal(found.id, 'hit');
});

test('the same caption without a filename matches only an unused media message', () => {
  const found = findSentMessage([
    {fromMe:true, id:'text', timestamp:recent, body:'Özet', type:'chat'},
    {fromMe:true, id:'doc', timestamp:recent, body:'Özet', hasMedia:true, type:'document'},
  ], {fileName:'ozet.png', caption:'Özet', sinceMs:since, usedIds:[]});
  assert.equal(found.id, 'doc');
  assert.equal(findSentMessage([{fromMe:true, id:'other', timestamp:recent, filename:'baska.png', body:'Özet', type:'document'}], {fileName:'ozet.png', caption:'Özet', sinceMs:since}), null);
});

test('a missing file can be retried twice and an unreadable chat cannot', () => {
  assert.equal(nextDeliveryStep({lookup:'found', sends:1, resumed:true}), 'record');
  assert.equal(nextDeliveryStep({lookup:'missing', sends:0, resumed:false}), 'send');
  assert.equal(nextDeliveryStep({lookup:'missing', sends:2, resumed:true}), 'send');
  assert.equal(nextDeliveryStep({lookup:'missing', sends:3, resumed:true}), 'fail');
  assert.equal(nextDeliveryStep({lookup:'unread', sends:0, resumed:false}), 'send');
  assert.equal(nextDeliveryStep({lookup:'unread', sends:0, resumed:true}), 'unknown');
  assert.equal(nextDeliveryStep({lookup:'unread', sends:1, resumed:false}), 'unknown');
});
