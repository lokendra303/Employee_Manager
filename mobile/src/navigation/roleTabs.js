export function getTabsForUser(user) {
  if (!user) return [];

  if (user.role === 'SYSTEM_ADMIN') {
    return [
      { name: 'SystemAdmin', title: 'Organizations', icon: 'business' },
      { name: 'Profile', title: 'Profile', icon: 'person' },
    ];
  }

  if (user.role === 'ADMIN') {
    return [
      { name: 'Dashboard', title: 'Home', icon: 'home' },
      { name: 'Attendance', title: 'Attendance', icon: 'calendar' },
      { name: 'Workers', title: 'Workers', icon: 'people' },
      { name: 'FundRequests', title: 'Funds', icon: 'cash' },
      { name: 'More', title: 'More', icon: 'menu' },
    ];
  }

  if (user.role === 'SUPERVISOR') {
    const tabs = [
      { name: 'Attendance', title: 'Attendance', icon: 'calendar' },
      { name: 'PaySalary', title: 'Pay', icon: 'card' },
      { name: 'Wallet', title: 'Wallet', icon: 'wallet' },
      { name: 'FundRequests', title: 'Funds', icon: 'cash' },
      { name: 'Transactions', title: 'Payments', icon: 'list' },
    ];
    if (user.linkedDistributorId) {
      tabs.splice(1, 0, {
        name: 'DistributorHome',
        title: 'Dist. Pay',
        icon: 'briefcase',
      });
    }
    return tabs.slice(0, 5);
  }

  if (user.role === 'DISTRIBUTOR') {
    return [
      { name: 'DistributorHome', title: 'Owed', icon: 'card' },
      { name: 'Wallet', title: 'Wallet', icon: 'wallet' },
      { name: 'FundRequests', title: 'Funds', icon: 'cash' },
      { name: 'Transactions', title: 'Ledger', icon: 'list' },
      { name: 'Reports', title: 'Reports', icon: 'stats-chart' },
    ];
  }

  return [{ name: 'Attendance', title: 'Attendance', icon: 'calendar' }];
}

export function getMoreLinks(user) {
  if (user?.role !== 'ADMIN') return [];
  return [
    { screen: 'Distributors', title: 'Distributors' },
    { screen: 'Supervisors', title: 'Supervisors' },
    { screen: 'Transactions', title: 'Payments' },
    { screen: 'Reports', title: 'Reports' },
    { screen: 'PaySalary', title: 'Pay Salary' },
    { screen: 'Profile', title: 'My Profile' },
  ];
}
