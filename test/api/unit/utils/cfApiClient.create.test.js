const { expect } = require('chai');
const nock = require('nock');
const CloudFoundryAPIClient = require('../../../../api/utils/cfApiClient');
const mockTokenRequest = require('../../support/cfAuthNock');
const apiNocks = require('../../support/cfAPINocks');
const responses = require('../../support/factory/responses');

describe('CloudFoundryAPIClient', () => {
  afterEach(() => nock.cleanAll());

  describe('.createS3ServiceInstance', () => {
    it('should return a new service plan', (done) => {
      const name = 'my-bucket';
      const planName = 'aws-bucket';
      const planGuid = 'plan-guid';

      const requestBody = { name, service_plan_guid: planGuid };

      const planResponses = {
        resources: [
          responses.service({ guid: planGuid }, { name: planName }),
        ],
      };
      const serviceResponse = responses.service({}, { name });

      mockTokenRequest();
      apiNocks.mockFetchS3ServicePlanGUID(planResponses);
      apiNocks.mockCreateS3ServiceInstance(requestBody, serviceResponse);

      const apiClient = new CloudFoundryAPIClient();
      apiClient.createS3ServiceInstance(name, planName)
        .then((res) => {
          expect(res).to.be.an('object');
          expect(res.entity.name).to.equal(name);
          done();
        });
    });

    it('should return 400 when missing name or service plan name', (done) => {
      const name = undefined;
      const serviceName = 'service-name';

      const requestBody = {};

      const planResponse = {
        resources: [
          responses.service(undefined, { name: serviceName }),
          responses.service(),
        ],
      };

      mockTokenRequest();
      apiNocks.mockFetchS3ServicePlanGUID(planResponse);
      apiNocks.mockCreateS3ServiceInstance(requestBody);

      const apiClient = new CloudFoundryAPIClient();
      apiClient.createS3ServiceInstance(name, serviceName)
        .catch((err) => {
          expect(err).to.be.an('error');
          done();
        });
    });
  });

  describe('.createServiceKey', () => {
    it('should return a new service key', (done) => {
      const name = 'my-service-instance';
      const keyName = `${name}-key`;
      const serviceInstanceGuid = 'service-instance-guid';

      const requestBody = {
        name,
        service_instance_guid: serviceInstanceGuid,
      };

      const response = responses.service({}, {
        name: keyName,
        service_instance_guid: serviceInstanceGuid,
      });

      mockTokenRequest();
      apiNocks.mockCreateServiceKey(requestBody, response);

      const apiClient = new CloudFoundryAPIClient();
      apiClient.createServiceKey(name, serviceInstanceGuid)
        .then((res) => {
          expect(res).to.deep.equal(response);
          done();
        });
    });

    it('should return a new service key with custom key name', (done) => {
      const name = 'my-service-instance';
      const customKeyName = 'super-key';
      const keyName = `${name}-${customKeyName}`;
      const serviceInstanceGuid = 'service-instance-guid';

      const requestBody = {
        name,
        service_instance_guid: serviceInstanceGuid,
      };

      const response = responses.service({}, {
        name: keyName,
        service_instance_guid: serviceInstanceGuid,
      });

      mockTokenRequest();
      apiNocks.mockCreateServiceKey(requestBody, response);

      const apiClient = new CloudFoundryAPIClient();
      apiClient.createServiceKey(name, serviceInstanceGuid, customKeyName)
        .then((res) => {
          expect(res).to.deep.equal(response);
          done();
        });
    });

    it('should return 400 when missing name or service instance guid', (done) => {
      const name = undefined;
      const serviceInstanceGuid = 'service-instance-guid';

      const requestBody = {};

      mockTokenRequest();
      apiNocks.mockCreateServiceKey(requestBody);

      const apiClient = new CloudFoundryAPIClient();
      apiClient.createServiceKey(name, serviceInstanceGuid)
        .catch((err) => {
          expect(err).to.be.an('error');
          done();
        });
    });
  });

  describe('.creatSiteBucket', () => {
    it('should create a new S3 service and service key', (done) => {
      const name = 'my-bucket';
      const keyIdentifier = 'key';
      const keyName = `${name}-key`;
      const planName = 'aws-bucket';
      const planGuid = 'plan-guid';
      const bucketGuid = 'bucket-guid';

      const instanceRequestBody = { name, service_plan_guid: planGuid };
      const keyRequestBody = { name, service_instance_guid: bucketGuid };

      const planResponses = {
        resources: [
          responses.service({ guid: planGuid }, { name: planName }),
        ],
      };
      const bucketResponse = responses.service({ guid: bucketGuid }, { name });
      const keyResponse = responses.service({}, {
        name: keyName,
        service_instance_guid: bucketGuid,
      });

      mockTokenRequest();
      apiNocks.mockFetchS3ServicePlanGUID(planResponses);
      apiNocks.mockCreateS3ServiceInstance(instanceRequestBody, bucketResponse);
      apiNocks.mockCreateServiceKey(keyRequestBody, keyResponse);

      const apiClient = new CloudFoundryAPIClient();
      apiClient.createSiteBucket(name, keyIdentifier, planName)
        .then((res) => {
          expect(res).to.be.an('object');
          expect(res.entity.name).to.equal(keyName);
          expect(res.entity.service_instance_guid).to.equal(bucketGuid);
          done();
        });
    });
  });
});
