import type { Href } from 'expo-router';
import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import type { PermissionId } from '../types';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type StaffTabKey = 'index' | 'jobs' | 'customers' | 'vehicles' | 'more';

export type StaffTabDef = {
  name: StaffTabKey;
  title: string;
  icon: IconName;
  gates: PermissionId[];
};

export const STAFF_TABS: StaffTabDef[] = [
  { name: 'index', title: 'Dashboard', icon: 'grid-outline', gates: ['dashboard.view'] },
  { name: 'jobs', title: 'Jobs', icon: 'construct-outline', gates: ['job_cards.read'] },
  { name: 'customers', title: 'Customers', icon: 'people-outline', gates: ['customers.read'] },
  { name: 'vehicles', title: 'Vehicles', icon: 'car-outline', gates: ['vehicles.read'] },
  { name: 'more', title: 'More', icon: 'menu-outline', gates: [] },
];

export type MoreLink = {
  href: Href;
  title: string;
  subtitle: string;
  gates: PermissionId[];
};

export const STAFF_MORE_LINKS: MoreLink[] = [
  {
    href: '/(staff)/estimates',
    title: 'Estimates',
    subtitle: 'Quotes and approvals',
    gates: ['estimates.manage', 'estimates.approve'],
  },
  {
    href: '/(staff)/inventory',
    title: 'Inventory',
    subtitle: 'Parts and stock',
    gates: ['inventory.read'],
  },
  {
    href: '/(staff)/billing',
    title: 'Billing',
    subtitle: 'GST invoices and payments',
    gates: ['billing.read'],
  },
  {
    href: '/(staff)/employees',
    title: 'Employees',
    subtitle: 'Team profiles',
    gates: ['employees.read'],
  },
  {
    href: '/(staff)/attendance',
    title: 'Attendance',
    subtitle: 'Check-in and leave',
    gates: ['attendance.manage', 'attendance.self'],
  },
  {
    href: '/(staff)/payroll',
    title: 'Payroll',
    subtitle: 'Salary and PF/ESI',
    gates: ['payroll.read', 'payroll.manage'],
  },
  {
    href: '/(staff)/reports',
    title: 'Reports',
    subtitle: 'Sales and operations',
    gates: ['reports.view'],
  },
  {
    href: '/(staff)/profile',
    title: 'Profile',
    subtitle: 'Account and password',
    gates: [],
  },
];
