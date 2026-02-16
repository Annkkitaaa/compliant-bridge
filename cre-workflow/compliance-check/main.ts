import { CronCapability, handler, Runner, ok, text, type Runtime } from "@chainlink/cre-sdk";

type Config = {
  schedule: string;
  complianceApiBaseUrl: string;
  evms: Array<{
    chainSelectorName: string;
    gatewayContractAddress: string;
  }>;
};

const onCronTrigger = (runtime: Runtime<Config>): string => {
  runtime.log("Compliance Check Workflow initialized");
  runtime.log(`API Base URL: ${runtime.config.complianceApiBaseUrl}`);
  runtime.log(`EVM targets: ${runtime.config.evms.length}`);
  return "Compliance Check Workflow executed successfully";
};

const initWorkflow = (config: Config) => {
  const cron = new CronCapability();

  return [
    handler(
      cron.trigger({ schedule: config.schedule }),
      onCronTrigger
    ),
  ];
};

export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}
