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
    return [
      { name: 'SupervisorHome', title: 'Home', icon: 'home' },
      { name: 'Attendance', title: 'Attendance', icon: 'calendar' },
      { name: 'PaySalary', title: 'Pay', icon: 'card' },
      { name: 'Wallet', title: 'Wallet', icon: 'wallet' },
      { name: 'More', title: 'More', icon: 'menu' },
    ];
  }

  if (user.role === 'DISTRIBUTOR') {
    return [
      { name: 'DistributorDashboard', title: 'Home', icon: 'home' },
      { name: 'DistributorHome', title: 'Owed', icon: 'card' },
      { name: 'Wallet', title: 'Wallet', icon: 'wallet' },
      { name: 'More', title: 'More', icon: 'menu' },
    ];
  }

  return [{ name: 'Attendance', title: 'Attendance', icon: 'calendar' }];
}

export function getMoreLinks(user) {
  if (user?.role === 'ADMIN') {
    return [
      { screen: 'AdminDistributors', title: 'Distributors' },
      { screen: 'AdminSupervisors', title: 'Supervisors' },
      { screen: 'AdminPayments', title: 'Payments' },
      { screen: 'AdminReports', title: 'Reports' },
      { screen: 'AdminPaySalary', title: 'Pay Salary' },
      { screen: 'Profile', title: 'My Profile' },
    ];
  }

  if (user?.role === 'SUPERVISOR') {
    const links = [
      { screen: 'FundRequests', title: 'Fund Requests' },
      { screen: 'Transactions', title: 'Payments' },
      { screen: 'Profile', title: 'My Profile' },
    ];
    if (user.linkedDistributorId) {
      links.unshift({ screen: 'DistributorHome', title: 'Distributor Workers' });
    }
    return links;
  }

  if (user?.role === 'DISTRIBUTOR') {
    return [
      { screen: 'FundRequests', title: 'Fund Requests' },
      { screen: 'Transactions', title: 'Payment Ledger' },
      { screen: 'Reports', title: 'Reports' },
      { screen: 'Profile', title: 'My Profile' },
    ];
  }

  return [];
}
