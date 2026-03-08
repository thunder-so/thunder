import { Construct } from 'constructs';

export function getResourceIdPrefix(application: string, service: string, environment: string): string {
    return `${application.substring(0, 7)}-${service.substring(0, 7)}-${environment.substring(0, 7)}`.substring(0, 23).toLowerCase();
}
