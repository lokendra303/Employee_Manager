import PaySalaryScreen from './PaySalaryScreen';

export default function DistributorHomeScreen(props) {
  return (
    <PaySalaryScreen
      {...props}
      route={{ ...props.route, params: { title: 'Workers Owed' } }}
    />
  );
}
