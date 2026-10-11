import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARTIFACT_ADMISSION_MAX_BYTES,
  ARTIFACT_ADMISSION_MAX_BASE64_CHARS,
  ArtifactAdmissionSchema
} from '../src/evidence-admission.js';

const common={
  mission_id:'NM-c4ca97029aa2',
  expected_state_version:2,
  phase_work_id:'NPW-size-contract',
  work_contract_revision:2
};

test('artifact admission schema and decoded-byte ceiling are one exact contract',()=>{
  assert.equal(ARTIFACT_ADMISSION_MAX_BYTES,8*1024*1024);
  assert.equal(ARTIFACT_ADMISSION_MAX_BASE64_CHARS,4*Math.ceil(ARTIFACT_ADMISSION_MAX_BYTES/3));

  const atLimit=Buffer.alloc(ARTIFACT_ADMISSION_MAX_BYTES).toString('base64');
  assert.equal(atLimit.length,ARTIFACT_ADMISSION_MAX_BASE64_CHARS);
  assert.equal(ArtifactAdmissionSchema.safeParse({...common,data_base64:atLimit}).success,true);

  const overLimit=Buffer.alloc(ARTIFACT_ADMISSION_MAX_BYTES+1).toString('base64');
  assert.equal(overLimit.length>ARTIFACT_ADMISSION_MAX_BASE64_CHARS,true);
  assert.equal(ArtifactAdmissionSchema.safeParse({...common,data_base64:overLimit}).success,false);
});
