# MinIO CORS setup

Apply the bundled CORS policy to any development buckets so signed URLs and range requests succeed:

```bash
aws --endpoint-url "${S3_ENDPOINT:-http://localhost:9000}" \
  s3api put-bucket-cors \
  --bucket <bucket-name> \
  --cors-configuration file://infra/minio/cors.json
```

Run the command for both the public and private buckets configured in your local environment.
