import { RemovalPolicy } from "aws-cdk-lib";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

export interface CloudWatchAgentProps {
  stackName: string;
  logRetentionDays?: number;
}

export interface CloudWatchLogGroups {
  userDataLogGroup: LogGroup;
  dockerLogGroup: LogGroup;
  syslogLogGroup: LogGroup;
}

export class CloudWatchAgent extends Construct {
  public readonly logGroups: CloudWatchLogGroups;
  /** The agent config JSON — inline this into user data. */
  public readonly agentConfigJson: string;

  constructor(scope: Construct, id: string, props: CloudWatchAgentProps) {
    super(scope, id);

    const retention =
      props.logRetentionDays !== undefined
        ? getRetentionDays(props.logRetentionDays)
        : RetentionDays.ONE_MONTH;

    const userDataLogGroup = new LogGroup(this, "UserDataLogGroup", {
      logGroupName: `/ec2/${props.stackName}/user-data`,
      retention,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const dockerLogGroup = new LogGroup(this, "DockerLogGroup", {
      logGroupName: `/ec2/${props.stackName}/docker`,
      retention,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const syslogLogGroup = new LogGroup(this, "SyslogLogGroup", {
      logGroupName: `/ec2/${props.stackName}/syslog`,
      retention,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.logGroups = { userDataLogGroup, dockerLogGroup, syslogLogGroup };

    // Build the CloudWatch agent JSON config
    this.agentConfigJson = JSON.stringify(
      {
        agent: {
          run_as_user: "root",
        },
        logs: {
          logs_collected: {
            files: {
              collect_list: [
                {
                  file_path: "/var/log/user-data.log",
                  log_group_name: userDataLogGroup.logGroupName,
                  log_stream_name: "{instance_id}/user-data",
                  timezone: "UTC",
                  timestamp_format: "%a %b %d %H:%M:%S %Z %Y",
                },
                {
                  file_path: "/var/log/syslog",
                  log_group_name: syslogLogGroup.logGroupName,
                  log_stream_name: "{instance_id}/syslog",
                  timezone: "UTC",
                },
                {
                  file_path: "/var/lib/docker/containers/**/*-json.log",
                  log_group_name: dockerLogGroup.logGroupName,
                  log_stream_name: "{instance_id}/containers",
                  timezone: "UTC",
                  timestamp_format: "%Y-%m-%dT%H:%M:%S.%f%z",
                  multi_line_start_pattern: "{datetime_format}",
                },
              ],
            },
          },
        },
      },
      null,
      2
    );
  }
}

function getRetentionDays(days: number): RetentionDays {
  const validValues = [
    1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1096, 1827,
    2192, 2557, 2922, 3288, 3653,
  ];
  if (validValues.includes(days)) return days as RetentionDays;
  return RetentionDays.ONE_MONTH;
}
